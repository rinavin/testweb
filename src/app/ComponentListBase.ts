import {Component} from '@angular/core';

export abstract class ComponentListBase
{
    public abstract getComponents(name:string):Component;
    public abstract getTitle(): string;
}
