import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { InventoryPdfData, InventoryPdfItem } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 11,
    color: "#555",
    marginBottom: 24,
  },
  addrLine: {
    fontSize: 10,
    color: "#333",
    marginBottom: 2,
  },
  sectionHead: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #ddd",
  },
  twoCol: { flexDirection: "row", gap: 24, marginTop: 12 },
  col: { flexGrow: 1, flexBasis: 0 },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  kvLabel: { color: "#555" },
  kvValue: { fontFamily: "Helvetica-Bold" },
  roomHead: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
    color: "#222",
  },
  table: { borderTop: "1pt solid #ddd" },
  tr: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eee",
    paddingVertical: 4,
  },
  thRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #ccc",
    paddingVertical: 4,
    backgroundColor: "#f5f5f5",
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#333" },
  cName: { width: "30%", paddingRight: 4 },
  cCat: { width: "16%", paddingRight: 4, color: "#444" },
  cDisp: { width: "12%", paddingRight: 4 },
  cDest: { width: "16%", paddingRight: 4, color: "#444" },
  cBox: { width: "10%", paddingRight: 4, fontFamily: "Helvetica-Bold" },
  cNotes: { width: "16%", color: "#666" },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    fontSize: 8,
    color: "#888",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  fragMark: { color: "#b91c1c", fontFamily: "Helvetica-Bold" },
  emptyNote: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
    marginTop: 12,
  },
});

const DISPOSITION_LABEL: Record<string, string> = {
  undecided: "Undecided",
  moving: "Moving",
  storage: "Storage",
  donate: "Donate",
  trash: "Trash",
  sold: "Sold",
};

const BOX_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ItemRow({ item }: { item: InventoryPdfItem }) {
  const fragile = item.fragility !== "normal";
  return (
    <View style={styles.tr} wrap={false}>
      <Text style={styles.cName}>
        {fragile ? <Text style={styles.fragMark}>★ </Text> : null}
        {item.name}
        {item.quantity > 1 ? ` ×${item.quantity}` : ""}
      </Text>
      <Text style={styles.cCat}>{item.categoryLabel ?? "—"}</Text>
      <Text style={styles.cDisp}>
        {DISPOSITION_LABEL[item.disposition] ?? item.disposition}
      </Text>
      <Text style={styles.cDest}>{item.destinationLabel ?? "—"}</Text>
      <Text style={styles.cBox}>{item.boxShortCode ?? ""}</Text>
      <Text style={styles.cNotes}>{item.notes ?? ""}</Text>
    </View>
  );
}

function HeaderRow() {
  return (
    <View style={styles.thRow} fixed>
      <Text style={[styles.th, styles.cName]}>Item</Text>
      <Text style={[styles.th, styles.cCat]}>Category</Text>
      <Text style={[styles.th, styles.cDisp]}>Disposition</Text>
      <Text style={[styles.th, styles.cDest]}>Destination</Text>
      <Text style={[styles.th, styles.cBox]}>Box</Text>
      <Text style={[styles.th, styles.cNotes]}>Notes</Text>
    </View>
  );
}

export function InventoryDocument({ data }: { data: InventoryPdfData }) {
  const { move, totals, prediction, truck, generatedAt, groups } = data;
  const totalQuantity = totals.quantity;

  return (
    <Document title={`pakt inventory — ${move.name}`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.coverTitle}>{move.name}</Text>
        <Text style={styles.coverSubtitle}>
          {move.plannedMoveDate
            ? `Planned for ${formatDate(new Date(move.plannedMoveDate))}`
            : "Move date not set"}
        </Text>

        {move.originAddress ? (
          <Text style={styles.addrLine}>From: {move.originAddress}</Text>
        ) : null}
        {move.destinationAddress ? (
          <Text style={styles.addrLine}>To: {move.destinationAddress}</Text>
        ) : null}

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionHead}>Inventory totals</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Distinct items</Text>
              <Text style={styles.kvValue}>{totals.items}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Total quantity</Text>
              <Text style={styles.kvValue}>{totalQuantity}</Text>
            </View>
            {(
              ["moving", "storage", "donate", "trash", "sold", "undecided"] as const
            ).map((d) => (
              <View key={d} style={styles.kvRow}>
                <Text style={styles.kvLabel}>{DISPOSITION_LABEL[d]}</Text>
                <Text style={styles.kvValue}>{totals.byDisposition[d]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionHead}>Predicted boxes</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Total boxes</Text>
              <Text style={styles.kvValue}>{prediction.totalBoxCount}</Text>
            </View>
            {(
              Object.keys(prediction.boxesByType) as Array<
                keyof typeof prediction.boxesByType
              >
            )
              .filter((k) => prediction.boxesByType[k] > 0)
              .map((k) => (
                <View key={k} style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{BOX_LABEL[k]}</Text>
                  <Text style={styles.kvValue}>
                    {prediction.boxesByType[k]}
                  </Text>
                </View>
              ))}

            <Text style={styles.sectionHead}>Recommended truck</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Size</Text>
              <Text style={styles.kvValue}>
                {truck.size === "oversized" ? "Too much for one trip" : truck.size}
              </Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Estimated volume</Text>
              <Text style={styles.kvValue}>
                {truck.totalVolumeCuFt.toFixed(0)} cuft
              </Text>
            </View>
            {truck.heavyItemCount > 0 ? (
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Heavy items (&gt;150 lb)</Text>
                <Text style={styles.kvValue}>{truck.heavyItemCount}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={[styles.emptyNote, { marginTop: 24 }]}>
          Generated {formatDate(generatedAt)} · pakt
        </Text>

        <View style={styles.footer} fixed>
          <Text>{move.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.coverTitle}>Items</Text>
        <Text style={styles.coverSubtitle}>
          Grouped by source room. ★ = fragile.
        </Text>

        {groups.length === 0 ? (
          <Text style={styles.emptyNote}>
            No items have been added to this move yet.
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.roomId ?? "unassigned"} wrap>
              <Text style={styles.roomHead}>
                {group.roomLabel} · {group.items.length} item
                {group.items.length === 1 ? "" : "s"}
              </Text>
              <View style={styles.table}>
                <HeaderRow />
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text>{move.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInventoryPdfBuffer(
  data: InventoryPdfData,
): Promise<Buffer> {
  const blob = await pdf(<InventoryDocument data={data} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function inventoryFilename(moveName: string, generatedAt: Date): string {
  const slug = moveName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "move";
  const date = generatedAt.toISOString().slice(0, 10);
  return `pakt-inventory-${slug}-${date}.pdf`;
}
