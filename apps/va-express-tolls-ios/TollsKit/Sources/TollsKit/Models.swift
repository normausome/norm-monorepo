import Foundation

// Mirrors apps/va-express-tolls/src/lib/api-types.ts. Field names match the JSON exactly.

public enum Direction: String, Codable, Sendable, Hashable {
    case eb, wb, nb, sb
}

public struct DirectionOption: Codable, Sendable, Hashable, Identifiable {
    public let id: Direction
    public let label: String
}

/// One row of `GET /api/corridors`.
public struct Corridor: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let name: String
    public let supported: Bool
    public let reason: String?
    public let directions: [DirectionOption]
    public let historical: Bool
    public let calculatorUrl: URL
}

public struct TripPoint: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    public let lat: Double?
    public let lng: Double?
}

public struct TripEntry: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    public let lat: Double?
    public let lng: Double?
    public let exits: [TripPoint]
}

public struct PointsResponse: Codable, Sendable, Hashable {
    public let corridor: String
    public let direction: Direction
    public let entries: [TripEntry]
    /// Live operator status for this direction (e.g. which way reversible lanes are open).
    public let notice: String?
}

public struct EstimateLeg: Codable, Sendable, Hashable {
    public let road: String
    public let price: Double
    public let observedAt: String?
    public let status: String?
}

public struct EstimateSource: Codable, Sendable, Hashable {
    public let `operator`: String
    public let url: URL
    public let fetchedAt: String
}

public struct Estimate: Codable, Sendable, Hashable {
    public enum Kind: String, Codable, Sendable { case current, historical }

    public let corridor: String
    public let direction: Direction
    public let entry: TripPoint
    public let exit: TripPoint
    public let kind: Kind
    /// Sum of legs, or nil when the operator returned no usable price. Never synthesised client-side.
    public let total: Double?
    public let currency: String
    public let legs: [EstimateLeg]
    public let source: EstimateSource
    public let notes: [String]
}

struct APIErrorBody: Decodable {
    let error: String
}
