import { Calendar, DragHelper, type DragHelperConfig, Grid, Toast } from '@bryntum/calendar';
import type { AppEventModel } from './AppTypes';

type DragConfig = DragHelperConfig & {
    grid: Grid
    calendar: Calendar
    outerElement: HTMLElement
};

export default class Drag extends DragHelper {

    static configurable = {
        callOnFunctions      : true,
        // Don't drag the actual cell element, clone it
        cloneTarget          : true,
        // We size the cloned element using CSS
        autoSizeClonedTarget : false,
        // Only allow drops on calendar tasks
        dropTargetSelector   : '.b-cal-event',
        // Drag only the icon inside the cell
        proxySelector        : 'i',
        // Only allow dragging cell elements inside on the equipment grid
        targetSelector       : '.b-grid-row:not(.b-group-row) .b-grid-cell'
    };

    public grid: Grid;
    public calendar: Calendar;
    public outerElement: HTMLElement;
    current!: Drag;

    constructor(config: DragConfig) {
        super(config);
        this.grid         = config.grid;
        this.calendar     = config.calendar;
        this.outerElement = config.outerElement;
    }

    // Listening to events using the onXXX notation, similar to this.on('dragStart', () => {})
    override onDragStart = ({ context }: { context: any }): void => {
        const { grid }    = this;
        // save a reference to the equipment so we can access it later
        context.equipment = grid.getRecordFromElement(context.grabbed);

        // Prevent tooltips from showing while dragging
        this.calendar.features.eventTooltip.disabled = true;
    };

    // In the onDrop, we instruct the drag helper to transition the drag proxy element to an approximate destination
    // before updating the event record (done in onDropFinalized)
    override onDrop = async({ context }: any) => {
        if (context.valid) {
            const
                equipmentItem = context.equipment,
                eventRecord   = this.calendar.resolveEventRecord(context.target) as AppEventModel;

            if (eventRecord.equipment.some(equipment => equipment.id === equipmentItem.id)) {
                context.valid = false;
                Toast.show(`${equipmentItem.name} is already assigned to ${eventRecord.name}`);
            }
            else {
                const
                    equipmentWrap = context.target.closest('.b-cal-event').querySelector('.b-event-equipment-wrap'),
                    animTarget    = equipmentWrap?.lastElementChild || equipmentWrap as HTMLElement;

                if (animTarget) {
                    await this.animateProxyTo(animTarget, {
                        align  : 'l0-r14',
                        offset : [
                            equipmentWrap?.lastElementChild ? parseInt(getComputedStyle(equipmentWrap.lastElementChild).marginInlineEnd) : 0
                        ]
                    });
                }
                eventRecord.equipment = eventRecord.equipment.concat(equipmentItem);
                Toast.show(`Added ${equipmentItem.name} to ${eventRecord.name}`);
            }
        }

        this.calendar.features.eventTooltip.disabled = false;
    };
}
