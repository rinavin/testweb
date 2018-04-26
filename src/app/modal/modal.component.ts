import { Component } from "@angular/core";

import { WindowType, WindowPosition } from "@magic/utils";

import { BaseTaskMagicComponent,TaskMagicService,BaseModalComponent } from "@magic/angular";


@Component({
	selector: "mga-modal",
	providers: [TaskMagicService],
	styleUrls: ["./modal.component.css"],
	templateUrl: "./modal.component.html"
})
export class modal extends BaseModalComponent {
	private static readonly formName: string = "modal";
	private static readonly showTitleBar: boolean = true;
	private static readonly x: number = 0;
	private static readonly y: number = 1;
	private static readonly windowPosition: WindowPosition = 1;

	get X() {
		return modal.x;
	}

	get Y() {
		return modal.y;
	}

	get WindowPosition() {
		return modal.windowPosition;
	}

	get FormName() {
		return modal.formName;
	}

	get ShowTitleBar() {
		return modal.showTitleBar;
	}
}
