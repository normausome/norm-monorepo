import SwiftUI
import TollsKit

enum Defaults {
    static let baseURLKey = "apiBaseURL"
    /// The simulator's localhost is the Mac's, so `bun run dev:api` in apps/va-express-tolls is enough.
    static let baseURL = "http://localhost:8787"
}

@main
struct VAExpressTollsApp: App {
    var body: some Scene {
        WindowGroup {
            CorridorListView()
        }
    }
}

/// Builds a client from the stored base URL; a bad URL is reported in the UI, not swallowed.
extension TollsAPI {
    static func fromSettings() throws -> TollsAPI {
        let raw = UserDefaults.standard.string(forKey: Defaults.baseURLKey) ?? Defaults.baseURL
        return try TollsAPI(baseURLString: raw)
    }
}
