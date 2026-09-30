export type PlatformView="home"|"library"|"chat"|"live"|"radio"|"system";
export interface PlatformUiState{readonly view:PlatformView;readonly busy:boolean;readonly error?:string;}
export interface PlatformUiAdapter{readonly id:string;readonly version:string;readonly target:"web"|"android"|"telegram"|"custom";mount(root:unknown,state:PlatformUiState):void;update(state:PlatformUiState):void;unmount():void;}
export class PlatformUiRegistry{private readonly adapters=new Map<string,PlatformUiAdapter>();register(a:PlatformUiAdapter){if(this.adapters.has(a.id))throw new Error("UI adapter already exists: "+a.id);this.adapters.set(a.id,a);}get(id:string){return this.adapters.get(id);}list(){return Object.freeze([...this.adapters.values()]);}}
