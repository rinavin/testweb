import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-WEBListBox1",
	providers: [TaskMagicService],
	styleUrls: ["./WEBListBox1.component.css"],
	templateUrl: "./WEBListBox1.component.html"
})
export class WEBListBox1 extends BaseTaskMagicComponent {}
