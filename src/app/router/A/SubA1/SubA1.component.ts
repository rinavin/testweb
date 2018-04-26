import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-SubA1",
	providers: [TaskMagicService],
	styleUrls: ["./SubA1.component.css"],
	templateUrl: "./SubA1.component.html"
})
export class SubA1 extends BaseTaskMagicComponent {}
