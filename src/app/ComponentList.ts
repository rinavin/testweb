import { ComponentListBase } from "./ComponentListBase";
import { Component } from "@angular/core";

import { caled as caled_caled } from "./router/caled/caled.component";

import { call as call_call } from "./router/call/call.component";

import { Root as Root_Root } from "./router/Root/Root.component";

import { A as A_A } from "./router/A/A.component";

import { SubA1 as A_SubA1_SubA1 } from "./router/A/SubA1/SubA1.component";

import { B as B_B } from "./router/B/B.component";

import { checkbox as checkbox_checkbox } from "./router/checkbox/checkbox.component";

import { web as web_web } from "./web/web.component";

import { web1 as aaa_web1 } from "./aaa/web1.component";

import { WEBListBox1 as WEBListBox1_WEBListBox1 } from "./WEBListBox1/WEBListBox1.component";

import { WebClientaa as WebClientaa_WebClientaa } from "./WebClientaa/WebClientaa.component";

import { modal as modal_modal } from "./modal/modal.component";

import { web as web_web } from "./aaa/web/web.component";

export class ComponentsList extends ComponentListBase {
	static compHash: { [x: string]: any } = {
		caled_caled: caled_caled,

		call_call: call_call,

		Root_Root: Root_Root,

		A_A: A_A,

		A_SubA1_SubA1: A_SubA1_SubA1,

		B_B: B_B,

		checkbox_checkbox: checkbox_checkbox,

		web_web: web_web,

		aaa_web1: aaa_web1,

		WEBListBox1_WEBListBox1: WEBListBox1_WEBListBox1,

		WebClientaa_WebClientaa: WebClientaa_WebClientaa,

		modal_modal: modal_modal,

		web_web: web_web
	};

	static ComponentArray: any[] = [
		caled_caled,

		call_call,

		Root_Root,

		A_A,

		A_SubA1_SubA1,

		B_B,

		checkbox_checkbox,

		web_web,

		aaa_web1,

		WEBListBox1_WEBListBox1,

		WebClientaa_WebClientaa,

		modal_modal,

		web_web
	];

	static getArray() {
		return this.ComponentArray;
	}

	public getComponents(name: string): Component {
		return ComponentsList.compHash[name];
	}

	public static getAllComponents() {
		return this.ComponentArray;
	}

	public getTitle(): string {
		return "testweb";
	}
}
