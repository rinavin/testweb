import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-B",
	providers: [TaskMagicService],
	styleUrls: ["./B.component.css"],
	templateUrl: "./B.component.html"
})
export class B extends BaseTaskMagicComponent {}
