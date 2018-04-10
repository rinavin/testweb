import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../../magic/src/services/task.magics.service";

export namespace A_SubA1_SubA1 {
	@Component({
		selector: "mga-SubA1",
		providers: [TaskMagicService],
		styleUrls: ["./SubA1.component.css"],
		templateUrl: "./SubA1.component.html"
	})
	export class SubA1 extends BaseTaskMagicComponent {}
}
