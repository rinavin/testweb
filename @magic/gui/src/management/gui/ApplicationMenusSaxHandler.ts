import {List} from "@magic/mscorelib";
import {MgMenu} from "./MgMenu";

export class ApplicationMenusSaxHandler {
  // private static MNT_TYPE_MENU: number = 1;
  // private static MNT_TYPE_PROG: number = 2;
  // private static MNT_TYPE_ACTION: number = 3;
  // private static MNT_TYPE_OS: number = 4;
  // private static MNT_TYPE_LINE: number = 5;
  // private static MNT_TYPE_WINDOW_LIST: number = 7;
  // private _mgMenus: List<MgMenu> = null;
  // private _objectsStack: Stack = null;
  // private _currentMenuEntry: MenuEntry = null;
  // private _currentMgMenu: MgMenu = null;
  // private _currentObjectType: ApplicationMenusSaxHandler_CurrentObjectType = null;
  // private _inAccessKeyTag: boolean = false;
  // private _inArgumentTag: boolean = false;
  // private _inEventTag: boolean = false;
  // private _keyCode: number = 0;
  // private _modifier: Modifiers = 0;
  constructor(menus: List<MgMenu>) {
    // this._mgMenus = menus;
    // this._objectsStack = new Stack();
    // this._inEventTag = false;
    // this._inAccessKeyTag = false;
    // this._modifier = Modifiers.MODIFIER_NONE;
    // this._keyCode = -1;
  }

  parse(menusData: string) {

  }

  // startElement(elementName: string, attributes: NameValueCollection): void {
    // let flag: boolean = false;
    // let num: number = _PrivateImplementationDetails_.ComputeStringHash(elementName);
    // if (num <= 2626085950)
    // {
    // 	if (num <= 1371155046)
    // 	{
    // 		if (num <= 308540042)
    // 		{
    // 			if (num <= 58561129)
    // 			{
    // 				if (num !== 12978010)
    // 				{
    // 					if (num === 58561129)
    // 					{
    // 						if (elementName === "ImageFor")
    // 						{
    // 							let text: string = attributes.get_Item("val");
    // 							let a: string = text;
    // 							if (!(a === "B"))
    // 							{
    // 								if (!(a === "M"))
    // 								{
    // 									this._currentMenuEntry.Imagefor = GuiMenuEntry_ImageFor.MENU_IMAGE_TOOLBAR;
    // 								}
    // 								else
    // 								{
    // 									this._currentMenuEntry.Imagefor = GuiMenuEntry_ImageFor.MENU_IMAGE_MENU;
    // 								}
    // 							}
    // 							else
    // 							{
    // 								this._currentMenuEntry.Imagefor = GuiMenuEntry_ImageFor.MENU_IMAGE_BOTH;
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Menu")
    // 					{
    // 						this._currentMgMenu = new MgMenu();
    // 						this.pushCurrentObject(this._currentMgMenu);
    // 						this._mgMenus.Add(this._currentMgMenu);
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 198508992)
    // 				{
    // 					if (num !== 266367750)
    // 					{
    // 						if (num === 308540042)
    // 						{
    // 							if (elementName === "FieldID")
    // 							{
    // 								let valueStr: string = attributes.get_Item("val");
    // 								(<MenuEntryProgram>this._currentMenuEntry).ReturnCtxIdVee = <number>(<number>XmlParser.getInt(valueStr));
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "Name")
    // 						{
    // 							let flag2: boolean = this.isMgMenu();
    // 							if (flag2)
    // 							{
    // 								this._currentMgMenu.setName(attributes.get_Item("val"));
    // 							}
    // 							else
    // 							{
    // 								this._currentMenuEntry.setName(attributes.get_Item("val"));
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Wait")
    // 					{
    // 						(<MenuEntryOSCommand>this._currentMenuEntry).Wait = this.getBooleanValue(attributes);
    // 					}
    // 				}
    // 			}
    // 		}
    // 		else
    // 		{
    // 			if (num <= 695479900)
    // 			{
    // 				if (num !== 600163587)
    // 				{
    // 					if (num === 695479900)
    // 					{
    // 						if (elementName === "Show")
    // 						{
    // 							let valueStr2: string = attributes.get_Item("val");
    // 							(<MenuEntryOSCommand>this._currentMenuEntry).Show = <CallOsShow>XmlParser.getInt(valueStr2);
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "PublicName")
    // 					{
    // 						(<MenuEntryProgram>this._currentMenuEntry).PublicName = attributes.get_Item("val");
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 964429142)
    // 				{
    // 					if (num !== 976948978)
    // 					{
    // 						if (num === 1371155046)
    // 						{
    // 							if (elementName === "Checked")
    // 							{
    // 								let booleanValue: boolean = this.getBooleanValue(attributes);
    // 								this._currentMenuEntry.setChecked(booleanValue, true);
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "MenuEntry")
    // 						{
    // 							this._currentObjectType = ApplicationMenusSaxHandler_CurrentObjectType.MENU_TYPE_MENU_ENTRY;
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Argument")
    // 					{
    // 						this._inArgumentTag = true;
    // 					}
    // 				}
    // 			}
    // 		}
    // 	}
    // 	else
    // 	{
    // 		if (num <= 1879011130)
    // 		{
    // 			if (num <= 1610582935)
    // 			{
    // 				if (num !== 1557851329)
    // 				{
    // 					if (num === 1610582935)
    // 					{
    // 						if (elementName === "PublicObject")
    // 						{
    // 							let flag3: boolean = this._inEventTag && this._currentMenuEntry.menuType() === GuiMenuEntry_MenuType.USER_EVENT;
    // 							if (flag3)
    // 							{
    // 								(<MenuEntryEvent>this._currentMenuEntry).UserEvtIdx = this.getInt(attributes, "obj");
    // 								(<MenuEntryEvent>this._currentMenuEntry).UserEvtCompIndex = this.getInt(attributes, "comp");
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "VISIBLE")
    // 					{
    // 						let booleanValue: boolean = this.getBooleanValue(attributes);
    // 						this._currentMenuEntry.setVisible(booleanValue, true, false, null);
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 1759955728)
    // 				{
    // 					if (num !== 1773733173)
    // 					{
    // 						if (num === 1879011130)
    // 						{
    // 							if (elementName === "MenuType")
    // 							{
    // 								let menuEntry: MenuEntry = null;
    // 								let flag4: boolean = !this.isMgMenu();
    // 								if (flag4)
    // 								{
    // 									let IL_7B4: number = 1;
    // 									let _goto: number = 0;
    // 									_GOTO_LOOP:
    // 									while (true)
    // 									{
    // 										switch (_goto)
    // 										{
    // 										default:
    // 											switch (this.getInt(attributes))
    // 											{
    // 											case 1:
    // 												menuEntry = new MenuEntryMenu(this._currentMgMenu);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											case 2:
    // 												menuEntry = new MenuEntryProgram(this._currentMgMenu);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											case 3:
    // 												menuEntry = new MenuEntryEvent(this._currentMgMenu);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											case 4:
    // 												menuEntry = new MenuEntryOSCommand(this._currentMgMenu);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											case 5:
    // 												menuEntry = new MenuEntry(GuiMenuEntry_MenuType.SEPARATOR, this._currentMgMenu);
    // 												menuEntry.setVisible(true, true, false, null);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											case 7:
    // 												menuEntry = new MenuEntryWindowMenu(this._currentMgMenu);
    // 												menuEntry.setVisible(true, true, false, null);
    // 												_goto = IL_7B4;
    // 												continue _GOTO_LOOP;
    // 											}
    // 											flag = true;
    // 											_goto = IL_7B4;
    // 											continue _GOTO_LOOP;
    // 										case 1:
    // 											let flag5: boolean = !flag;
    // 											if (flag5)
    // 											{
    // 												let flag6: boolean = this._objectsStack.Peek() instanceof MgMenu;
    // 												if (flag6)
    // 												{
    // 													this._currentMgMenu.addSubMenu(menuEntry);
    // 												}
    // 												else
    // 												{
    // 													(<MenuEntryMenu>this._currentMenuEntry).addSubMenu(menuEntry);
    // 												}
    // 												this.pushCurrentObject(menuEntry);
    // 											}
    // 											break _GOTO_LOOP;
    // 										}
    // 									}
    // 								}
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "InternalEventID")
    // 						{
    // 							let flag7: boolean = this._inEventTag && this._currentMenuEntry.menuType() === GuiMenuEntry_MenuType.INTERNAL_EVENT;
    // 							if (flag7)
    // 							{
    // 								(<MenuEntryEvent>this._currentMenuEntry).InternalEvent = this.getInt(attributes);
    // 								this._currentMenuEntry.setEnabled(this._currentMenuEntry.getEnabled(), true, false);
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Icon")
    // 					{
    // 						let imageFile: string = Events.TranslateLogicalName(attributes.get_Item("val"));
    // 						this._currentMenuEntry.ImageFile = imageFile;
    // 					}
    // 				}
    // 			}
    // 		}
    // 		else
    // 		{
    // 			if (num <= 2079510631)
    // 			{
    // 				if (num !== 1993809835)
    // 				{
    // 					if (num === 2079510631)
    // 					{
    // 						if (elementName === "EventType")
    // 						{
    // 							let text2: string = attributes.get_Item("val");
    // 							let flag8: boolean = text2 === "U";
    // 							if (flag8)
    // 							{
    // 								this._currentMenuEntry.setType(GuiMenuEntry_MenuType.USER_EVENT);
    // 							}
    // 							else
    // 							{
    // 								let flag9: boolean = text2 === "I";
    // 								if (flag9)
    // 								{
    // 									this._currentMenuEntry.setType(GuiMenuEntry_MenuType.INTERNAL_EVENT);
    // 								}
    // 								else
    // 								{
    // 									let flag10: boolean = text2 === "S";
    // 									if (flag10)
    // 									{
    // 										this._currentMenuEntry.setType(GuiMenuEntry_MenuType.SYSTEM_EVENT);
    // 									}
    // 								}
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "SourceContext")
    // 					{
    // 						let valueStr3: string = attributes.get_Item("val");
    // 						(<MenuEntryProgram>this._currentMenuEntry).SourceContext = <MenuEntryProgram_SrcContext>XmlParser.getInt(valueStr3);
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 2079691557)
    // 				{
    // 					if (num !== 2163989966)
    // 					{
    // 						if (num === 2626085950)
    // 						{
    // 							if (elementName === "Enabled")
    // 							{
    // 								let booleanValue: boolean = this.getBooleanValue(attributes);
    // 								this._currentMenuEntry.setEnabled(booleanValue, false, false);
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "ToolGroup")
    // 						{
    // 							this._currentMenuEntry.ImageGroup = this.getInt(attributes);
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Variable")
    // 					{
    // 						let inArgumentTag: boolean = this._inArgumentTag;
    // 						if (inArgumentTag)
    // 						{
    // 							let flag11: boolean = this._currentMenuEntry instanceof MenuEntryProgram;
    // 							if (flag11)
    // 							{
    // 								(<MenuEntryProgram>this._currentMenuEntry).MainProgVars.Add(attributes.get_Item("val"));
    // 							}
    // 							else
    // 							{
    // 								let flag12: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 								if (flag12)
    // 								{
    // 									(<MenuEntryEvent>this._currentMenuEntry).MainProgVars.Add(attributes.get_Item("val"));
    // 								}
    // 							}
    // 						}
    // 					}
    // 				}
    // 			}
    // 		}
    // 	}
    // }
    // else
    // {
    // 	if (num <= 3297429318)
    // 	{
    // 		if (num <= 3097358362)
    // 		{
    // 			if (num <= 2872234690)
    // 			{
    // 				if (num !== 2738624831)
    // 				{
    // 					if (num === 2872234690)
    // 					{
    // 						if (elementName === "IsParallel")
    // 						{
    // 							let booleanValue: boolean = this.getBooleanValue(attributes);
    // 							(<MenuEntryProgram>this._currentMenuEntry).IsParallel = booleanValue;
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Arguments")
    // 					{
    // 						let flag13: boolean = this._currentMenuEntry instanceof MenuEntryProgram;
    // 						if (flag13)
    // 						{
    // 							(<MenuEntryProgram>this._currentMenuEntry).MainProgVars = new List<string>();
    // 						}
    // 						else
    // 						{
    // 							let flag14: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 							if (flag14)
    // 							{
    // 								(<MenuEntryEvent>this._currentMenuEntry).MainProgVars = new List<string>();
    // 							}
    // 						}
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 2952982194)
    // 				{
    // 					if (num !== 3077776264)
    // 					{
    // 						if (num === 3097358362)
    // 						{
    // 							if (elementName === "Help")
    // 							{
    // 								let $int: number = this.getInt(attributes, "obj");
    // 								let flag15: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 								if (flag15)
    // 								{
    // 									(<MenuEntryEvent>this._currentMenuEntry).Help = $int;
    // 								}
    // 								else
    // 								{
    // 									let flag16: boolean = this._currentMenuEntry instanceof MenuEntryOSCommand;
    // 									if (flag16)
    // 									{
    // 										(<MenuEntryOSCommand>this._currentMenuEntry).Help = $int;
    // 									}
    // 									else
    // 									{
    // 										let flag17: boolean = this._currentMenuEntry instanceof MenuEntryProgram;
    // 										if (flag17)
    // 										{
    // 											(<MenuEntryProgram>this._currentMenuEntry).Help = $int;
    // 										}
    // 									}
    // 								}
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "PrgFlow")
    // 						{
    // 							(<MenuEntryProgram>this._currentMenuEntry).Flow = attributes.get_Item("val").get_Item(0);
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "AccessKey")
    // 					{
    // 						this._inAccessKeyTag = true;
    // 					}
    // 				}
    // 			}
    // 		}
    // 		else
    // 		{
    // 			if (num <= 3243699741)
    // 			{
    // 				if (num !== 3113569606)
    // 				{
    // 					if (num === 3243699741)
    // 					{
    // 						if (elementName === "Parent")
    // 						{
    // 							let inEventTag: boolean = this._inEventTag;
    // 							if (inEventTag)
    // 							{
    // 								(<MenuEntryEvent>this._currentMenuEntry).UserEvtTaskId = attributes.get_Item("val");
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "ToolNumber")
    // 					{
    // 						this._currentMenuEntry.ImageNumber = this.getInt(attributes);
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 3247949794)
    // 				{
    // 					if (num !== 3290774379)
    // 					{
    // 						if (num === 3297429318)
    // 						{
    // 							if (elementName === "DestinationContext")
    // 							{
    // 								let destinationContext: string = attributes.get_Item("val");
    // 								let flag18: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 								if (flag18)
    // 								{
    // 									(<MenuEntryEvent>this._currentMenuEntry).DestinationContext = destinationContext;
    // 								}
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "Program")
    // 						{
    // 							(<MenuEntryProgram>this._currentMenuEntry).Idx = this.getInt(attributes, "obj");
    // 							(<MenuEntryProgram>this._currentMenuEntry).Comp = this.getInt(attributes, "comp");
    // 							(<MenuEntryProgram>this._currentMenuEntry).ProgramIsn = this.getInt(attributes, "ObjIsn");
    // 							(<MenuEntryProgram>this._currentMenuEntry).CtlIndex = this.getInt(attributes, "CtlIndex");
    // 							this._currentMenuEntry.setEnabled(this._currentMenuEntry.getEnabled(), true, false);
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Skip")
    // 					{
    // 						let flag19: boolean = this._inArgumentTag && attributes.get_Item("val").Equals("Y");
    // 						if (flag19)
    // 						{
    // 							let flag20: boolean = this._currentMenuEntry instanceof MenuEntryProgram;
    // 							if (flag20)
    // 							{
    // 								(<MenuEntryProgram>this._currentMenuEntry).MainProgVars.Add("Skip");
    // 							}
    // 							else
    // 							{
    // 								let flag21: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 								if (flag21)
    // 								{
    // 									(<MenuEntryEvent>this._currentMenuEntry).MainProgVars.Add("Skip");
    // 								}
    // 							}
    // 						}
    // 					}
    // 				}
    // 			}
    // 		}
    // 	}
    // 	else
    // 	{
    // 		if (num <= 3685453332)
    // 		{
    // 			if (num <= 3441084684)
    // 			{
    // 				if (num !== 3308840341)
    // 				{
    // 					if (num === 3441084684)
    // 					{
    // 						if (elementName === "Key")
    // 						{
    // 							let flag22: boolean = (this._inEventTag && this._currentMenuEntry.menuType() === GuiMenuEntry_MenuType.SYSTEM_EVENT) || this._inAccessKeyTag;
    // 							if (flag22)
    // 							{
    // 								this._keyCode = this.getInt(attributes);
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Description_U")
    // 					{
    // 						let flag23: boolean = this.isMgMenu();
    // 						if (flag23)
    // 						{
    // 							this._currentMgMenu.setText(attributes.get_Item("val"));
    // 						}
    // 						else
    // 						{
    // 							this._currentMenuEntry.setText(attributes.get_Item("val"), true);
    // 						}
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 3485200219)
    // 				{
    // 					if (num !== 3492500287)
    // 					{
    // 						if (num === 3685453332)
    // 						{
    // 							if (elementName === "Ext")
    // 							{
    // 								(<MenuEntryOSCommand>this._currentMenuEntry).OsCommand = attributes.get_Item("val");
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "Event")
    // 						{
    // 							this._inEventTag = true;
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "Prompt")
    // 					{
    // 						let prompt: string = attributes.get_Item("val");
    // 						let flag24: boolean = this._currentMenuEntry instanceof MenuEntryEvent;
    // 						if (flag24)
    // 						{
    // 							(<MenuEntryEvent>this._currentMenuEntry).Prompt = prompt;
    // 						}
    // 						else
    // 						{
    // 							let flag25: boolean = this._currentMenuEntry instanceof MenuEntryOSCommand;
    // 							if (flag25)
    // 							{
    // 								(<MenuEntryOSCommand>this._currentMenuEntry).Prompt = prompt;
    // 							}
    // 							else
    // 							{
    // 								let flag26: boolean = this._currentMenuEntry instanceof MenuEntryProgram;
    // 								if (flag26)
    // 								{
    // 									(<MenuEntryProgram>this._currentMenuEntry).Prompt = prompt;
    // 								}
    // 							}
    // 						}
    // 					}
    // 				}
    // 			}
    // 		}
    // 		else
    // 		{
    // 			if (num <= 3709043928)
    // 			{
    // 				if (num !== 3695101994)
    // 				{
    // 					if (num === 3709043928)
    // 					{
    // 						if (elementName === "Tooltip_U")
    // 						{
    // 							this._currentMenuEntry.toolTip(attributes.get_Item("val"));
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "PrgDescription")
    // 					{
    // 						(<MenuEntryProgram>this._currentMenuEntry).Description = attributes.get_Item("val");
    // 					}
    // 				}
    // 			}
    // 			else
    // 			{
    // 				if (num !== 3794470813)
    // 				{
    // 					if (num !== 3876828784)
    // 					{
    // 						if (num === 4047878376)
    // 						{
    // 							if (elementName === "MenuUid")
    // 							{
    // 								let flag27: boolean = this.isMgMenu();
    // 								if (flag27)
    // 								{
    // 									this._currentMgMenu.setUid(this.getInt(attributes));
    // 								}
    // 								else
    // 								{
    // 									this._currentMenuEntry.setUid(this.getInt(attributes));
    // 								}
    // 							}
    // 						}
    // 					}
    // 					else
    // 					{
    // 						if (elementName === "Modifier")
    // 						{
    // 							let flag28: boolean = (this._inEventTag && this._currentMenuEntry.menuType() === GuiMenuEntry_MenuType.SYSTEM_EVENT) || this._inAccessKeyTag;
    // 							if (flag28)
    // 							{
    // 								this._modifier = <Modifiers>attributes.get_Item("val").get_Item(0);
    // 							}
    // 						}
    // 					}
    // 				}
    // 				else
    // 				{
    // 					if (elementName === "COPY_GLOBAL_PARAMS")
    // 					{
    // 						let copyGlobalParameters: boolean = false;
    // 						let flag29: boolean = attributes.get_Item("val").Equals("Y");
    // 						if (flag29)
    // 						{
    // 							copyGlobalParameters = true;
    // 						}
    // 						(<MenuEntryProgram>this._currentMenuEntry).CopyGlobalParameters = copyGlobalParameters;
    // 					}
    // 				}
    // 			}
    // 		}
    // 	}
    // }
  // }


  endElement(elementName: string, elementValue: string): void {
    // let flag: boolean = NString.EndsWith(elementName, "Menu") || NString.EndsWith(elementName, "MenuEntry");
    // if (flag)
    // {
    // 	this.popCurrentObject();
    // }
    // else
    // {
    // 	let flag2: boolean = elementName === "Event";
    // 	if (flag2)
    // 	{
    // 		let flag3: boolean = this._keyCode !== -1 || this._modifier !== Modifiers.MODIFIER_NONE;
    // 		if (flag3)
    // 		{
    // 			(<MenuEntryEvent>this._currentMenuEntry).KbdEvent = new KeyboardItem(this._keyCode, this._modifier);
    // 			this._keyCode = -1;
    // 			this._modifier = Modifiers.MODIFIER_NONE;
    // 		}
    // 		this._currentMenuEntry.setEnabled(this._currentMenuEntry.getEnabled(), true, false);
    // 		this._inEventTag = false;
    // 	}
    // 	else
    // 	{
    // 		let flag4: boolean = NString.EndsWith(elementName, "Argument");
    // 		if (flag4)
    // 		{
    // 			this._inArgumentTag = false;
    // 		}
    // 		else
    // 		{
    // 			let flag5: boolean = elementName === "AccessKey";
    // 			if (flag5)
    // 			{
    // 				let flag6: boolean = this._keyCode !== -1 || this._modifier !== Modifiers.MODIFIER_NONE;
    // 				if (flag6)
    // 				{
    // 					this._currentMenuEntry.AccessKey = new KeyboardItem(this._keyCode, this._modifier);
    // 					this._keyCode = -1;
    // 					this._modifier = Modifiers.MODIFIER_NONE;
    // 				}
    // 				this._inAccessKeyTag = false;
    // 			}
    // 		}
    // 	}
    // }
  }

  // private pushCurrentObject(obj: MgMenu): void;
  // private pushCurrentObject(obj: MenuEntry): void;
  // private pushCurrentObject(obj: any): void
  // {
  // 	if (arguments.length === 1 && (obj === null || obj instanceof MgMenu))
  // 	{
  // 		this.pushCurrentObject_0(obj);
  // 		return;
  // 	}
  // 	this.pushCurrentObject_1(obj);
  // }

  // private pushCurrentObject_0(obj: MgMenu): void
  // {
  // 	this._currentMgMenu = obj;
  // 	this._objectsStack.Push(this._currentMgMenu);
  // 	this._currentObjectType = ApplicationMenusSaxHandler_CurrentObjectType.MENU_TYPE_MENU;
  // }

  // private pushCurrentObject_1(obj: MenuEntry): void
  // {
  // 	this._currentMenuEntry = obj;
  // 	this._objectsStack.Push(this._currentMenuEntry);
  // 	this._currentObjectType = ApplicationMenusSaxHandler_CurrentObjectType.MENU_TYPE_MENU_ENTRY;
  // }

  // private popCurrentObject(): void
  // {
  // 	this._objectsStack.Pop();
  // 	let flag: boolean = this._objectsStack.Count === 0;
  // 	if (flag)
  // 	{
  // 		this._currentMgMenu = null;
  // 		this._currentMenuEntry = null;
  // 	}
  // 	else
  // 	{
  // 		let flag2: boolean = this._objectsStack.Peek() instanceof MgMenu;
  // 		if (flag2)
  // 		{
  // 			this._currentMgMenu = <MgMenu>this._objectsStack.Peek();
  // 			this._currentMenuEntry = null;
  // 		}
  // 		else
  // 		{
  // 			this._currentMenuEntry = <MenuEntry>this._objectsStack.Peek();
  // 		}
  // 	}
  // }

  // private isMgMenu(): boolean
  // {
  // 	return this._currentObjectType === ApplicationMenusSaxHandler_CurrentObjectType.MENU_TYPE_MENU;
  // }

  // private getBooleanValue(atts: NameValueCollection): boolean
  // {
  // 	return atts.get_Item("val").Equals("Y");
  // }

  // private getInt(atts: NameValueCollection): number;
  // private getInt(atts: NameValueCollection, str: string): number;
  // private getInt(atts: NameValueCollection, str?: string): number
  // {
  // 	if (arguments.length === 1 && (atts === null || atts instanceof NameValueCollection))
  // 	{
  // 		return this.getInt_0(atts);
  // 	}
  // 	return this.getInt_1(atts, str);
  // }

  // private getInt_0(atts: NameValueCollection): number
  // {
  // 	return this.getInt(atts, "val");
  // }

  // private getInt_1(atts: NameValueCollection, str: string): number
  // {
  // 	let text: string = atts.get_Item(str);
  // 	let flag: boolean = text !== null && text !== "";
  // 	let result: number;
  // 	if (flag)
  // 	{
  // 		result = NNumber.Parse(text);
  // 	}
  // 	else
  // 	{
  // 		result = 0;
  // 	}
  // 	return result;
  // }
}

export class ApplicationMenusSaxHandler_CurrentObjectType {
  static MENU_TYPE_MENU: ApplicationMenusSaxHandler_CurrentObjectType = new ApplicationMenusSaxHandler_CurrentObjectType();
  static MENU_TYPE_MENU_ENTRY: ApplicationMenusSaxHandler_CurrentObjectType = new ApplicationMenusSaxHandler_CurrentObjectType();
}
