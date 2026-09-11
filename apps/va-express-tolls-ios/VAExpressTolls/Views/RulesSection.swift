import SwiftUI

struct RulesSection: View {
    @Bindable var store: EstimatorStore

    var body: some View {
        let corridor = store.selectedCorridor
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("3. Know the rules")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                Text(corridor.name)
                    .font(.title2.bold())
                Text(corridor.extent)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 8) {
                Label("When you pay", systemImage: "clock")
                    .font(.subheadline.weight(.semibold))
                Text(corridor.whenTolled)
                    .font(.subheadline)
                if corridor.id == .inside66 {
                    ScheduleBannerView()
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text("How the price is set")
                    .font(.subheadline.weight(.semibold))
                Text(corridor.pricing)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(corridor.rules, id: \.self) { rule in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(Color.accentColor)
                            .frame(width: 6, height: 6)
                            .padding(.top, 6)
                        Text(rule)
                            .font(.subheadline)
                    }
                }
            }

            DisclosureGroup("Using the official \(corridor.calculatorHost) calculator instead? What to expect") {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(corridor.calculatorTips, id: \.self) { tip in
                        Text(tip)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 6)
            }
            .font(.subheadline.weight(.semibold))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct ScheduleBannerView: View {
    @State private var status = InsideBeltwaySchedule.status()

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(isTolling ? Color.accentColor : Color(uiColor: .secondarySystemFill), in: Capsule())
                .foregroundStyle(isTolling ? Color.white : Color.primary)
            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 4)
        .task {
            status = InsideBeltwaySchedule.status()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                status = InsideBeltwaySchedule.status()
            }
        }
    }

    private var isTolling: Bool {
        if case .tolling = status { return true }
        return false
    }

    private var title: String {
        switch status {
        case .tolling(let direction, let until):
            return "Tolling now · \(direction.rawValue) until \(until)"
        case .free:
            return "Free right now"
        }
    }

    private var detail: String {
        switch status {
        case .tolling:
            return "Based on the weekday schedule, Eastern time. Federal holidays are always free."
        case .free(let next):
            return "Next: \(next) (Eastern). Federal holidays are always free."
        }
    }
}
