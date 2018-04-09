import { ComponentListBase } from "./ComponentListBase";
import { Component } from "@angular/core";

import { web_web } from "./web/web.component";

import { aaa_web1 } from "./aaa/web1.component";

import { checkbox_checkbox } from "./checkbox/checkbox.component";

import { WEBListBox1_WEBListBox1 } from "./WEBListBox1/WEBListBox1.component";

import { router_caled_caled } from "./router/caled/caled.component";

import { router_call_call } from "./router/call/call.component";

export class ComponentsList extends ComponentListBase {
	static compHash: { [x: string]: any } = {
		web_web: web_web.web,

		aaa_web1: aaa_web1.web1,

		checkbox_checkbox: checkbox_checkbox.checkbox,

		WEBListBox1_WEBListBox1: WEBListBox1_WEBListBox1.WEBListBox1,

		caled_caled: router_caled_caled.caled,

		call_call: router_call_call.call
	};

	static ComponentArray: any[] = [
		web_web.web,

		aaa_web1.web1,

		checkbox_checkbox.checkbox,

		WEBListBox1_WEBListBox1.WEBListBox1,

		router_caled_caled.caled,

		router_call_call.call
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
