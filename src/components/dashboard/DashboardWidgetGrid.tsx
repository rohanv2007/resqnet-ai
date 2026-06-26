
import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useWidgetLayout, type WidgetConfig } from "@/lib/hooks/useWidgetLayout";

function SortableWidgetRow({
  widget,
  onToggle,
}: {
  widget: WidgetConfig;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: widget.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="flex items-center justify-between rounded-lg border bg-card p-3"
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab rounded-md p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
          <span className="sr-only">Reorder {widget.label}</span>
        </button>
        <span className="text-sm font-medium">{widget.label}</span>
      </div>
      <Switch checked={widget.visible} onCheckedChange={() => onToggle(widget.id)} />
    </div>
  );
}

export function DashboardWidgetGrid({
  renderWidget,
}: {
  renderWidget: (id: string) => React.ReactNode;
}) {
  const { widgets, visibleWidgets, toggleWidget, reorderWidgets, resetLayout } =
    useWidgetLayout();
  const [open, setOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => widgets.map((widget) => widget.id), [widgets]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
    const newIndex = widgets.findIndex((widget) => widget.id === over.id);
    reorderWidgets(arrayMove(widgets, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            <SlidersHorizontal className="h-4 w-4" />
            Customize Dashboard
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Customize Dashboard</DialogTitle>
            </DialogHeader>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="grid gap-2">
                  {widgets.map((widget) => (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      onToggle={toggleWidget}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <DialogFooter>
              <Button variant="outline" onClick={resetLayout}>
                Reset to default
              </Button>
              <Button onClick={() => setOpen(false)}>Save layout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {visibleWidgets.map((widget) => (
        <section key={widget.id}>{renderWidget(widget.id)}</section>
      ))}
    </div>
  );
}
