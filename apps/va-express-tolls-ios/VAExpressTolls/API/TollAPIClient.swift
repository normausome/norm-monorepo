import Foundation

enum APIConfiguration {
    /// Simulator shares the Mac loopback, so this reaches `bun run dev` on the host.
    static let simulatorDefault = URL(string: "http://127.0.0.1:8787")!

    static var baseURL: URL {
        if let raw = ProcessInfo.processInfo.environment["TOLL_API_BASE"],
           let url = URL(string: raw)
        {
            return url
        }
        return simulatorDefault
    }
}

struct TollAPIError: Error, LocalizedError, Equatable, Sendable {
    var message: String
    var statusCode: Int?

    var errorDescription: String? { message }
}

/// Thin URLSession client for the existing Bun `/api` — no operator adapters here.
struct TollAPIClient: Sendable {
    var baseURL: URL
    var session: URLSession

    init(baseURL: URL = APIConfiguration.baseURL, session: URLSession = TollAPIClient.makeSession()) {
        self.baseURL = baseURL
        self.session = session
    }

    static func makeSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 45
        configuration.httpAdditionalHeaders = ["Accept": "application/json"]
        return URLSession(configuration: configuration)
    }

    func corridors() async throws -> [CorridorSupportInfo] {
        let data = try await get(path: "/api/corridors")
        return try JSONDecoder().decode([CorridorSupportInfo].self, from: data)
    }

    func points(corridor: CorridorId, direction: Direction) async throws -> PointsResponse {
        let data = try await get(
            path: "/api/\(corridor.rawValue)/points",
            query: ["direction": direction.rawValue]
        )
        return try JSONDecoder().decode(PointsResponse.self, from: data)
    }

    func estimate(
        corridor: CorridorId,
        direction: Direction,
        entry: String,
        exit: String,
        at: String? = nil
    ) async throws -> CachedEstimateResponse {
        var query = [
            "direction": direction.rawValue,
            "entry": entry,
            "exit": exit,
        ]
        if let at, !at.isEmpty {
            query["at"] = at
        }
        let data = try await get(path: "/api/\(corridor.rawValue)/estimate", query: query)
        return try EstimateCodec.decode(data)
    }

    private func get(path: String, query: [String: String] = [:]) async throws -> Data {
        let url = try makeURL(path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (200 ..< 300).contains(status), !data.isEmpty {
            return data
        }
        if let body = try? JSONDecoder().decode(APIErrorBody.self, from: data), !body.error.isEmpty {
            throw TollAPIError(message: body.error, statusCode: status)
        }
        throw TollAPIError(message: "Request failed (\(status == 0 ? "no response" : "\(status)"))", statusCode: status)
    }

    private func makeURL(path: String, query: [String: String]) throws -> URL {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw TollAPIError(message: "Invalid API base URL")
        }
        let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
        let extra = path.hasPrefix("/") ? path : "/" + path
        components.path = basePath + extra
        if !query.isEmpty {
            components.queryItems = query
                .map { URLQueryItem(name: $0.key, value: $0.value) }
                .sorted { $0.name < $1.name }
        }
        guard let url = components.url else {
            throw TollAPIError(message: "Invalid API URL")
        }
        return url
    }
}
