import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-A",
	providers: [TaskMagicService],
	styleUrls: ["./A.component.css"],
	templateUrl: "./A.component.html"
})
export class A extends BaseTaskMagicComponent {}
