import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-GroupWithinGroup",
	providers: [TaskMagicService],
	styleUrls: ["./GroupWithinGroup.component.css"],
	templateUrl: "./GroupWithinGroup.component.html"
})
export class GroupWithinGroup extends BaseTaskMagicComponent {}
