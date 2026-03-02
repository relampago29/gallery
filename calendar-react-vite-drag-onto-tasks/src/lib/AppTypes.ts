import { EventModel, GridRowModel } from '@bryntum/calendar';

export class EquipmentModel extends GridRowModel {
    declare id: number;
    declare name: string;
    declare iconCls: string;
}

export class AppEventModel extends EventModel {
    equipment: EquipmentModel[];
    declare name: string;
}
