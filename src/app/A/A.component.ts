import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";

export namespace A_A {
	@Component({
		selector: "mga-A",
		providers: [TaskMagicService],
		styleUrls: ["./A.component.css"],
		templateUrl: "./A.component.html"
	})
	export class A extends BaseTaskMagicComponent {}
}
