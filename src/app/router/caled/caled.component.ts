import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-caled",
	providers: [TaskMagicService],
	styleUrls: ["./caled.component.css"],
	templateUrl: "./caled.component.html"
})
export class caled extends BaseTaskMagicComponent {}
