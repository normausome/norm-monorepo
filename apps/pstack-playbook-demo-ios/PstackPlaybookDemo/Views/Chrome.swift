import SwiftUI

struct Badge: View {
    enum Style {
        case filled, outline, tinted
    }

    let text: String
    var style: Style = .outline

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(background, in: Capsule())
            .foregroundStyle(foreground)
            .overlay {
                if style == .outline {
                    Capsule().strokeBorder(.tertiary, lineWidth: 1)
                }
            }
    }

    private var background: Color {
        switch style {
        case .filled: return Color.accentColor
        case .outline: return .clear
        case .tinted: return Color.accentColor.opacity(0.12)
        }
    }

    private var foreground: Color {
        switch style {
        case .filled: return .white
        case .outline: return .primary
        case .tinted: return Color.accentColor
        }
    }
}

extension Confidence {
    var badgeStyle: Badge.Style {
        switch self {
        case .high: return .filled
        case .medium: return .outline
        case .low: return .tinted
        }
    }
}

/// SwiftUI has no wrapping stack. Three call sites: sample chips, matched-keyword
/// badges, skill badges. A horizontal ScrollView would hide chips at large Dynamic Type.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layout(maxWidth: proposal.width ?? .infinity, subviews: subviews).size
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let result = layout(maxWidth: bounds.width, subviews: subviews)
        for index in subviews.indices {
            subviews[index].place(
                at: CGPoint(
                    x: bounds.minX + result.origins[index].x,
                    y: bounds.minY + result.origins[index].y
                ),
                proposal: ProposedViewSize(result.sizes[index])
            )
        }
    }

    private func layout(maxWidth: CGFloat, subviews: Subviews) -> (size: CGSize, origins: [CGPoint], sizes: [CGSize]) {
        var origins: [CGPoint] = []
        var sizes: [CGSize] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            origins.append(CGPoint(x: x, y: y))
            sizes.append(size)
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x - spacing)
        }

        return (CGSize(width: maxX, height: y + rowHeight), origins, sizes)
    }
}
