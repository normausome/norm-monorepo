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

    func testGeocodeFixtureDecodes() throws {
        let response = try JSONDecoder().decode(GeocodeResponse.self, from: fixture("geocode-tysons"))
        XCTAssertEqual(response.query, "Tysons")
        XCTAssertEqual(response.provider, "Photon")
        XCTAssertEqual(response.results.count, 2)
        XCTAssertEqual(response.results[0].label, "Tysons Corner, Virginia, United States")
        XCTAssertEqual(response.results[0].lat, 38.9169789, accuracy: 0.0001)
    }

    func testRouteTollsFixtureDecodesMoneyAsDecimal() throws {
        let route = try EstimateCodec.decodeRouteTolls(fixture("route-tolls-tysons-pentagon"))
        XCTAssertEqual(route.from.label, "Tysons Corner")
        XCTAssertEqual(route.to.label, "Pentagon")
        XCTAssertEqual(route.currency, "USD")
        XCTAssertEqual(route.legs.count, 1)
        XCTAssertEqual(route.legs[0].corridor, .inside66)
        XCTAssertEqual(route.legs[0].direction, .eb)
        XCTAssertEqual(route.total, 0)
        XCTAssertEqual(route.legs[0].estimate?.total, 0)
        XCTAssertFalse(route.route.geometry.isEmpty)
        XCTAssertEqual(route.route.geometry[0].count, 2)
    }

    func testParseLatLngSkipsGeocoder() {
        let place = AdvancedStore.parseLatLng(" 38.79, -77.18 ")
        XCTAssertEqual(place?.lat, 38.79)
        XCTAssertEqual(place?.lng, -77.18)
        XCTAssertNil(AdvancedStore.parseLatLng("Tysons Corner"))
    }

    private func fixture(_ name: String) throws -> Data {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures")
            .appendingPathComponent("\(name).json")
        return try Data(contentsOf: url)
    }
}
