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

// MARK: - Advanced mode (address → address)

struct Place: Codable, Hashable, Sendable, Identifiable {
    var label: String
    var lat: Double
    var lng: Double

    var id: String { "\(lat),\(lng)" }
}

struct GeocodeResponse: Codable, Hashable, Sendable {
    var query: String
    var results: [Place]
    var provider: String
}

enum RouteMatch: String, Codable, Hashable, Sendable {
    case onRoute = "on-route"
    case nearEnds = "near-ends"
}

struct RouteLeg: Hashable, Sendable, Identifiable, Decodable {
    var corridor: CorridorId
    var corridorName: String
    var direction: Direction
    var entry: TripPoint
    var exit: TripPoint
    var match: RouteMatch
    var estimate: CachedEstimateResponse?
    var error: String?
    var notice: String?
    var calculatorUrl: String

    var id: String { "\(corridor.rawValue)-\(entry.id)-\(exit.id)" }

    enum CodingKeys: String, CodingKey {
        case corridor, corridorName, direction, entry, exit, match
        case estimate, error, notice, calculatorUrl
    }
}

struct UnmatchedCorridor: Codable, Hashable, Sendable, Identifiable {
    var corridor: CorridorId
    var corridorName: String
    var calculatorUrl: String
    var reason: String

    var id: CorridorId { corridor }
}

struct RouteSummary: Hashable, Sendable, Decodable {
    var provider: String
    var distanceMeters: Int
    var durationSeconds: Int
    /// `[lat, lng]` pairs from the API.
    var geometry: [[Double]]

    enum CodingKeys: String, CodingKey {
        case provider, distanceMeters, durationSeconds, geometry
    }
}

struct RouteTollsResponse: Hashable, Sendable, Decodable {
    var from: Place
    var to: Place
    var route: RouteSummary
    var legs: [RouteLeg]
    var unmatched: [UnmatchedCorridor]
    var total: Decimal?
    var currency: String
    var notes: [String]

    enum CodingKeys: String, CodingKey {
        case from, to, route, legs, unmatched, total, currency, notes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        from = try container.decode(Place.self, forKey: .from)
        to = try container.decode(Place.self, forKey: .to)
        route = try container.decode(RouteSummary.self, forKey: .route)
        legs = try container.decode([RouteLeg].self, forKey: .legs)
        unmatched = try container.decode([UnmatchedCorridor].self, forKey: .unmatched)
        total = try container.decodeIfPresent(LiteralDecimal.self, forKey: .total)?.value
        currency = try container.decode(String.self, forKey: .currency)
        notes = try container.decode([String].self, forKey: .notes)
    }
}

struct TripPreset: Hashable, Sendable {
    var corridor: CorridorId
    var direction: Direction
    var entry: String
    var exit: String
}

enum AppMode: String, CaseIterable, Identifiable, Sendable {
    case simple
    case advanced

    var id: String { rawValue }

    var title: String {
        switch self {
        case .simple: "Simple"
        case .advanced: "Advanced"
        }
    }

    var hint: String {
        switch self {
        case .simple: "Pick a corridor, then your entry and exit"
        case .advanced: "Address to address — every corridor on the way"
        }
    }
}

extension Direction {
    var word: String {
        switch self {
        case .nb: "Northbound"
        case .sb: "Southbound"
        case .eb: "Eastbound"
        case .wb: "Westbound"
        }
    }
}
