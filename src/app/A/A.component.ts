import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace A_A {
	@Component({
		selector: "mga-A",
		providers: [TaskMagicService],
		styleUrls: ["./A.component.css"],
		templateUrl: "./A.component.html"
	})
	export class A extends BaseTaskMagicComponent {}
}
