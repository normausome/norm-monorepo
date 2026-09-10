import SwiftUI

@main
struct VAExpressTollsApp: App {
    @AppStorage("themePreference") private var themeRaw = ThemePreference.system.rawValue
    @State private var store = EstimatorStore(client: TollAPIClient())

    private var theme: ThemePreference {
        ThemePreference(rawValue: themeRaw) ?? .system
    }

    var body: some Scene {
        WindowGroup {
            RootView(store: store, themeRaw: $themeRaw)
                .preferredColorScheme(theme.colorScheme)
        }
    }
}
