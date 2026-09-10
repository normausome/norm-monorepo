import XCTest
@testable import VAExpressTolls

final class EstimateDecodingTests: XCTestCase {
    func testTotalTwentyThreeFifteenIsExactDecimal() throws {
        let estimate = try EstimateCodec.decode(fixture("estimate-23-15"))
        XCTAssertEqual(estimate.total, Decimal(string: "23.15"))
        XCTAssertEqual(estimate.total.map { "\($0)" }, "23.15")
        XCTAssertEqual(estimate.total, Decimal(sign: .plus, exponent: -2, significand: 2315))
        XCTAssertEqual(estimate.legs[0].price, Decimal(string: "18.10"))
        XCTAssertEqual(estimate.legs[1].price, Decimal(string: "5.05"))
        XCTAssertEqual(estimate.corridor, .express495)
        XCTAssertEqual(estimate.cache, .miss)
        XCTAssertEqual(estimate.kind, .current)
        XCTAssertEqual(estimate.currency, "USD")
    }

    func testZeroTotalIsARealQuote() throws {
        let estimate = try EstimateCodec.decode(fixture("estimate-zero"))
        XCTAssertEqual(estimate.total, 0)
        XCTAssertEqual(estimate.total.map { "\($0)" }, "0")
        XCTAssertEqual(MoneyFormat.displayTotal(estimate.total), "No toll")
        XCTAssertEqual(estimate.corridor, .inside66)
        XCTAssertEqual(estimate.legs.first?.status, "free")
        XCTAssertEqual(estimate.cache, .hit)
    }

    func testNullTotalIsUnavailablePrice() throws {
        let estimate = try EstimateCodec.decode(fixture("estimate-null-total"))
        XCTAssertNil(estimate.total)
        XCTAssertEqual(MoneyFormat.displayTotal(estimate.total), "No price available")
        XCTAssertTrue(estimate.legs.isEmpty)
        XCTAssertEqual(estimate.corridor, .express395)
        XCTAssertEqual(estimate.direction, .sb)
    }

    private func fixture(_ name: String) throws -> Data {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("\(name).json")
        return try Data(contentsOf: url)
    }
}
