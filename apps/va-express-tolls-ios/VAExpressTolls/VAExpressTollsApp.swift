import SwiftUI

@main
struct VAExpressTollsApp: App {
    @State private var store = EstimatorStore(client: TollAPIClient())

    var body: some Scene {
        WindowGroup {
            RootView(store: store)
        }
    }
}
