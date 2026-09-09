import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public enum TollsAPIError: LocalizedError, Equatable {
    /// The server answered with `{ "error": ... }`; shown to the user verbatim.
    case server(String, status: Int)
    case badStatus(Int)
    case notJSON
    case invalidBaseURL(String)

    public var errorDescription: String? {
        switch self {
        case .server(let message, _): return message
        case .badStatus(let status): return "The API returned HTTP \(status)."
        case .notJSON: return "The API returned something that is not JSON. Is the base URL pointing at va-express-tolls?"
        case .invalidBaseURL(let raw): return "\"\(raw)\" is not a valid URL."
        }
    }
}

/// Thin client for the `apps/va-express-tolls` Bun API. No pricing logic lives here:
/// whatever the server says is relayed, and anything else is an error.
public struct TollsAPI: Sendable {
    public let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public init(baseURLString: String, session: URLSession = .shared) throws {
        let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), let scheme = url.scheme, ["http", "https"].contains(scheme), url.host != nil else {
            throw TollsAPIError.invalidBaseURL(baseURLString)
        }
        self.init(baseURL: url, session: session)
    }

    public func corridors() async throws -> [Corridor] {
        try await get("/api/corridors")
    }

    public func points(corridor: String, direction: Direction) async throws -> PointsResponse {
        try await get("/api/\(corridor)/points", query: [URLQueryItem(name: "direction", value: direction.rawValue)])
    }

    public func estimate(corridor: String, direction: Direction, entry: String, exit: String) async throws -> Estimate {
        try await get("/api/\(corridor)/estimate", query: [
            URLQueryItem(name: "direction", value: direction.rawValue),
            URLQueryItem(name: "entry", value: entry),
            URLQueryItem(name: "exit", value: exit),
        ])
    }

    public func url(path: String, query: [URLQueryItem] = []) -> URL {
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        let base = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
        components.path = base + path
        components.queryItems = query.isEmpty ? nil : query
        return components.url!
    }

    private func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        var request = URLRequest(url: url(path: path, query: query))
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.timeoutInterval = 30
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        return try Self.decode(data, status: status)
    }

    /// Pure response → model step, separated so it can be unit-tested without a network.
    public static func decode<T: Decodable>(_ data: Data, status: Int) throws -> T {
        let decoder = JSONDecoder()
        guard (try? JSONSerialization.jsonObject(with: data)) != nil else { throw TollsAPIError.notJSON }
        if let body = try? decoder.decode(APIErrorBody.self, from: data) {
            throw TollsAPIError.server(body.error, status: status)
        }
        guard (200..<300).contains(status) else { throw TollsAPIError.badStatus(status) }
        return try decoder.decode(T.self, from: data)
    }
}
