import SwiftUI

@main
struct VAExpressTollsApp: App {
    @AppStorage("themePreference") private var themeRaw = ThemePreference.system.rawValue
    @State private var store: EstimatorStore
    @State private var advanced: AdvancedStore

    init() {
        let client = TollAPIClient()
        _store = State(initialValue: EstimatorStore(client: client))
        _advanced = State(initialValue: AdvancedStore(client: client))
    }

    private var theme: ThemePreference {
        ThemePreference(rawValue: themeRaw) ?? .system
    }

    var body: some Scene {
        WindowGroup {
            RootView(store: store, advanced: advanced, themeRaw: $themeRaw)
                .preferredColorScheme(theme.colorScheme)
        }
    }
}
