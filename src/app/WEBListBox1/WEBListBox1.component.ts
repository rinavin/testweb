import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace WEBListBox1_WEBListBox1 {
	@Component({
		selector: "mga-WEBListBox1",
		providers: [TaskMagicService],
		styleUrls: ["./WEBListBox1.component.css"],
		templateUrl: "./WEBListBox1.component.html"
	})
	export class WEBListBox1 extends BaseTaskMagicComponent {}
}
