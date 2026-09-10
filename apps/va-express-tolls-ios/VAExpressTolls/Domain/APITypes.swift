import Foundation

/// Mirrors `apps/va-express-tolls/src/data/corridors.ts` + `src/lib/api-types.ts`.
enum CorridorId: String, Codable, CaseIterable, Identifiable, Sendable, Hashable {
    case express495 = "495"
    case express395 = "395"
    case express95 = "95"
    case inside66 = "66-inside"
    case outside66 = "66-outside"

    var id: String { rawValue }
}

enum Direction: String, Codable, CaseIterable, Identifiable, Sendable, Hashable {
    case eb, wb, nb, sb

    var id: String { rawValue }
}

struct DirectionOption: Codable, Hashable, Sendable, Identifiable {
    var id: Direction
    var label: String
}

struct CorridorSupport: Codable, Hashable, Sendable, Identifiable {
    var id: CorridorId
    var supported: Bool
    var reason: String?
    var directions: [DirectionOption]
    var historical: Bool
}

/// `GET /api/corridors` row — support plus catalog name and official calculator URL.
struct CorridorSupportInfo: Codable, Hashable, Sendable, Identifiable {
    var id: CorridorId
    var supported: Bool
    var reason: String?
    var directions: [DirectionOption]
    var historical: Bool
    var name: String
    var calculatorUrl: String
}

struct TripPoint: Codable, Hashable, Sendable, Identifiable {
    var id: String
    var label: String
    var lat: Double?
    var lng: Double?
}

struct TripEntry: Codable, Hashable, Sendable, Identifiable {
    var id: String
    var label: String
    var lat: Double?
    var lng: Double?
    var exits: [TripPoint]
}

struct PointsResponse: Codable, Hashable, Sendable {
    var corridor: CorridorId
    var direction: Direction
    var entries: [TripEntry]
    var notice: String?
}

enum EstimateKind: String, Codable, Sendable, Hashable {
    case current
    case historical
}

enum CacheLabel: String, Codable, Sendable, Hashable {
    case hit
    case miss
}

struct EstimateSource: Hashable, Sendable, Decodable {
    var operatorName: String
    var url: String
    var fetchedAt: String

    enum CodingKeys: String, CodingKey {
        case operatorName = "operator"
        case url
        case fetchedAt
    }
}

struct EstimateLeg: Hashable, Sendable, Decodable {
    var road: String
    var price: Decimal
    var observedAt: String?
    var status: String?

    enum CodingKeys: String, CodingKey {
        case road, price, observedAt, status
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        road = try container.decode(String.self, forKey: .road)
        price = try container.decode(LiteralDecimal.self, forKey: .price).value
        observedAt = try container.decodeIfPresent(String.self, forKey: .observedAt)
        status = try container.decodeIfPresent(String.self, forKey: .status)
    }
}

struct CachedEstimateResponse: Hashable, Sendable, Decodable {
    var corridor: CorridorId
    var direction: Direction
    var entry: TripPoint
    var exit: TripPoint
    var kind: EstimateKind
    var total: Decimal?
    var currency: String
    var legs: [EstimateLeg]
    var source: EstimateSource
    var notes: [String]
    var cache: CacheLabel
    var cachedAt: String
    var expiresAt: String

    enum CodingKeys: String, CodingKey {
        case corridor, direction, entry, exit, kind, total, currency, legs, source, notes
        case cache, cachedAt, expiresAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        corridor = try container.decode(CorridorId.self, forKey: .corridor)
        direction = try container.decode(Direction.self, forKey: .direction)
        entry = try container.decode(TripPoint.self, forKey: .entry)
        exit = try container.decode(TripPoint.self, forKey: .exit)
        kind = try container.decode(EstimateKind.self, forKey: .kind)
        total = try container.decodeIfPresent(LiteralDecimal.self, forKey: .total)?.value
        currency = try container.decode(String.self, forKey: .currency)
        legs = try container.decode([EstimateLeg].self, forKey: .legs)
        source = try container.decode(EstimateSource.self, forKey: .source)
        notes = try container.decode([String].self, forKey: .notes)
        cache = try container.decode(CacheLabel.self, forKey: .cache)
        cachedAt = try container.decode(String.self, forKey: .cachedAt)
        expiresAt = try container.decode(String.self, forKey: .expiresAt)
    }
}

enum QuoteWhen: String, Hashable, Sendable {
    case now
    case past
}

enum QuoteState: Hashable, Sendable {
    case idle
    case loading
    case ready(CachedEstimateResponse)
    case unavailable(message: String, lastKnown: CachedEstimateResponse?)
}

struct APIErrorBody: Decodable, Sendable {
    var error: String
}
