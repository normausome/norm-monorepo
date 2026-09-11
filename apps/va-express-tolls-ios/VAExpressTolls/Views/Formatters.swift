import Foundation

enum MoneyFormat {
    static func usd(_ amount: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: amount as NSDecimalNumber) ?? "$\(amount)"
    }

    static func displayTotal(_ total: Decimal?) -> String {
        guard let total else { return "No price available" }
        if total == 0 { return "No toll" }
        return usd(total)
    }
}

enum EasternTimeFormat {
    static func display(_ iso: String) -> String {
        guard let date = parseISO(iso) else { return iso }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.timeZone = InsideBeltwaySchedule.timeZone
        formatter.dateFormat = "h:mm a zzz"
        return formatter.string(from: date)
    }

    private static func parseISO(_ raw: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: raw) { return date }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: raw)
    }
}
