import { Component } from "@angular/core";
import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";
import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace checkbox_checkbox {
	@Component({
		selector: "mga-checkbox",
		providers: [TaskMagicService],
		styleUrls: ["./checkbox.component.css"],
		templateUrl: "./checkbox.component.html"
	})
	export class checkbox extends BaseTaskMagicComponent {}
}
