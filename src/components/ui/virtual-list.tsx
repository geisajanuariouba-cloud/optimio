import { useRef, ReactNode, CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  /** Estimated row height in px. Default 56. */
  rowHeight?: number;
  /** How many extra rows to render outside the viewport. Default 8. */
  overscan?: number;
  /** Render a single row */
  renderRow: (item: T, index: number) => ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Optional sticky header rendered above the scrollable area */
  header?: ReactNode;
  /** Empty-state node */
  empty?: ReactNode;
}

/**
 * Lightweight virtualized list for big tables / grids.
 * Uses @tanstack/react-virtual under the hood.
 *
 * Usage:
 *   <VirtualList items={rows} rowHeight={60} renderRow={(r) => <Row data={r} />} />
 */
export function VirtualList<T>({
  items,
  rowHeight = 56,
  overscan = 8,
  renderRow,
  className,
  style,
  header,
  empty,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  if (items.length === 0 && empty) {
    return <div className={cn("flex flex-col", className)} style={style}>{header}{empty}</div>;
  }

  return (
    <div className={cn("flex flex-col min-h-0", className)} style={style}>
      {header}
      <div ref={parentRef} className="flex-1 overflow-auto" style={{ contain: "strict" }}>
        <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
          {virtualizer.getVirtualItems().map((v) => (
            <div
              key={v.key}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
              }}
            >
              {renderRow(items[v.index], v.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
