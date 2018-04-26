import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-checkbox",
	providers: [TaskMagicService],
	styleUrls: ["./checkbox.component.css"],
	templateUrl: "./checkbox.component.html"
})
export class checkbox extends BaseTaskMagicComponent {}
