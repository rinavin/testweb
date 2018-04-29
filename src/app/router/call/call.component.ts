import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-call",
	providers: [TaskMagicService],
	styleUrls: ["./call.component.css"],
	templateUrl: "./call.component.html"
})
export class call extends BaseTaskMagicComponent {}
