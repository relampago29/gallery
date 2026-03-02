import { BryntumCalendar, BryntumDemoHeader, BryntumGrid, BryntumSplitter } from '@bryntum/calendar-react';
import { type Combo, Store } from '@bryntum/calendar';
import { equipmentGridProps, useCalendarProps } from './AppConfig';
import { useEffect, useRef } from 'react';
import Drag from './lib/Drag';
import './App.scss';

function App() {
    const
        calendarRef = useRef<BryntumCalendar>(null),
        gridRef     = useRef<BryntumGrid>(null),
        dragRef     = useRef<Drag>(null),

        // Costume equipmentStore configuration
        equipmentStore = new Store({
            id     : 'equipment',
            fields : [
                'name',
                'iconCls'
            ],
            sorters : [
                { field : 'name', ascending : true }
            ]
        });

    const calendarProps = useCalendarProps(equipmentStore);

    useEffect(() => {
        const
            grid     = gridRef.current!.instance,
            calendar = calendarRef.current!.instance;

        if (calendar && grid) {

            const
                // Assign grid store to equipmentStore
                gridStore      = grid.store = equipmentStore,
                equipmentCombo = calendar.features.eventEdit.editor.widgetMap['equipment'] as Combo;

            // Use a chained Store to avoid it's filtering to interfere with calendar's rendering
            equipmentCombo.store = gridStore.chain();

            (dragRef as Drag).current = new Drag({
                grid,
                calendar,
                outerElement : grid.element
            });

            // We need to destroy Drag instance because React 18 Strict mode
            // runs this component twice in development mode, and Drag has no
            // UI, so it is not destroyed automatically as grid and scheduler.
            return () => (dragRef as Drag).current?.destroy?.();
        }
    }, [gridRef, calendarRef, dragRef, equipmentStore]);

    return (
        <>
            {/* BryntumDemoHeader component is used for Bryntum example styling only and can be removed */}
            <BryntumDemoHeader/>
            <div id="calendar-container" className="demo-app">
                <BryntumCalendar
                    ref={calendarRef}
                    {...calendarProps}
                />
                <BryntumSplitter/>
                <BryntumGrid
                    ref={gridRef}
                    {...equipmentGridProps}
                />
            </div>
        </>
    );
}

export default App;
