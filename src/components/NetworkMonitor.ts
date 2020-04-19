import { Component } from '../Component';
import Logger from '../Logger';
import Util from '../Util';
import { UIButton } from '../ui/UIButton';
import { UIComponent } from '../ui/UIComponent';
import './styles/NetworkMonitor.scss';

// Import the Monitor runnable as a raw string
// @ts-ignore
import runnable from '!raw-loader!../MonitorRunnable';
import { Checkbox, CheckboxAnimation } from '../ui/Checkbox';
import { Language } from '../Language';
import { LocalStorage } from '../Storage';

const { chrome, RTCPeerConnection } = (window as any);

/**
 * A tab and button displayed in the Stadia Menu.
 *
 * @export the UITab type.
 * @class UITab
 * @extends {Component}
 */
export class NetworkMonitor extends Component {
    /**
     * The name of the Component.
     */
    name: string = Language.get('network-monitor.name');

    /**
     * The tab element.
     */
    tabElement: HTMLElement;

    /**
     * The monitor element.
     */
    element: HTMLElement;

    /**
     * The [[UIComponent]] used to display the tab.
     */
    component: UIComponent;

    /**
     * The [[UIButton]] used to open the tab.
     */
    button: UIButton;

    constructor() {
        super();

        this.element = document.createElement('div');
        this.element.classList.add('stadiaplus_network-monitor');

        document.addEventListener('DOMContentLoaded', () => {
            this.startRunnable();
        })
    }

    active: boolean = false;
    visible: any = {
        'time': true,
        'resolution': true,
        'FPS': true,
        'latency': true,
        'codec': true,
        'traffic': true,
        'current-traffic': true,
        'average-traffic': true,
        'packets-lost': true,
        'average-packet-loss': true,
        'jitter-buffer': true,
    };
    orderMap: any = [
        'time',
        'resolution',
        'FPS',
        'latency',
        'codec',
        'traffic',
        'current-traffic',
        'average-traffic',
        'packets-lost',
        'average-packet-loss',
        'jitter-buffer'
    ]

    /**
     * Creates a [[UIComponent]] and a [[UIButton]]
     */
    createUI() {
        this.component = new UIComponent(
            Language.get('network-monitor.name'),
            `
            <div class='CTvDXd QAAyWd Fjy05d ivWUhc QSDHyc rpgZzc RkyH1e stadiaplus_button stadiaplus_networkmonitor-toggle-button' id='${this.id}-togglebutton'>Network Monitor</div>
            <hr>
            <h6>${Language.get('network-monitor.heading-visible')}</h6>
            <ul id='${this.id}-visiblelist'></ul>
            `,
            this.id,
        );
        this.component.element.classList.add('stadiaplus_networkmonitor-tab');

        const icon = chrome.runtime.getURL('images/icons/network-monitor.svg');
        this.button = new UIButton(icon, Language.get('network-monitor.button-label'), this.id + '-button');

        this.getStorage(() => { this.updateVisible() });
    }

    startRunnable() {
        this.desandbox(runnable);
    }

    openMonitor() {
        this.active = true;
        this.desandbox('StadiaPlusMonitor.start()');
    }

    closeMonitor() {
        this.active = false;
        this.desandbox('StadiaPlusMonitor.stop()');
    }
    
    getStorage(callback: (() => any) = (() => {})) {
        LocalStorage.MONITOR_STATS.get((result: any) => {
            if(result[LocalStorage.MONITOR_STATS.tag]) {
                this.visible = result[LocalStorage.MONITOR_STATS.tag];
            }
            callback();
        })
    }

    setStorage(callback: (() => any) = (() => {})) {
        LocalStorage.MONITOR_STATS.set(this.visible, callback);
    }

    /**
     * Called on startup, initializes important variables.
     */
    onStart(): void {
        this.enabled = true;
        this.startRunnable();
        this.createUI();

        Logger.component(Language.get('component.enabled', { name: this.name }));
    }

    /**
     * Called on stop, makes sure to dispose of elements and variables.
     */
    onStop(): void {
        this.enabled = false;
        this.button.element.remove();
        this.button.destroy();
        this.component.element.remove();
        this.closeMonitor();

        this.desandbox('StadiaPlusMonitor = null');

        Logger.component(Language.get('component.disabled', { name: this.name }));
    }

    updateVisible() {
        this.desandbox(`StadiaPlusMonitor.setVisible(${JSON.stringify(this.visible)})`);
    }

    /**
     * Called every second, makes sure to create components if they don't already exist.
     */
    onUpdate() {
        // Only create components if the menu is open already.
        if (Util.isMenuOpen() && Util.isInGame()) {
            if (!this.exists()) {
                const self = this;
                this.updateRenderer();
                this.component.create();

                this.component.onOpen(() => {
                    this.desandbox('StadiaPlusMonitor.setEditable(true)');
                });

                this.component.onClose(() => {
                    this.desandbox('StadiaPlusMonitor.setEditable(false)');
                });
                
                const list = document.getElementById(this.id + '-visiblelist');            
                for(const key of this.orderMap) {
                    const name: string = key.replace(/-/g, ' ').split(' ').map((name:string) => name.substring(0, 1).toUpperCase() + name.substring(1)).join(' ');
                    const value: boolean = this.visible[key];
                    const item = document.createElement('li');

                    const {pretty, checkbox} = new Checkbox(name).setBigger(true).setAnimation(CheckboxAnimation.SMOOTH).build();
                    pretty.classList.add('stadiaplus_networkmonitor-checkbox');

                    item.appendChild(pretty);
                    list.appendChild(item);
                    
                    checkbox.checked = value;
                    checkbox.addEventListener('click', () => {
                        this.visible[key] = checkbox.checked;
                        this.updateVisible();
                        this.setStorage();
                    });
                }

                const toggleButton = document.getElementById(this.id + '-togglebutton');
                toggleButton.classList.toggle('shown', this.active);
                
                toggleButton.addEventListener('click', () => {
                    if(!this.active) {
                        this.openMonitor();
                    }
                    else {
                        this.closeMonitor();
                    }
                    toggleButton.classList.toggle('shown', this.active);
                });

                this.button.create(() => {
                    self.button.button.addEventListener('click', () => {
                        self.component.openTab();
                    });
                });
            }

            if(!this.button.container.exists()) {
                this.button.container.create();
            }
        }
        else if(this.component.open) {
            this.component.closeTab();
        }
        
        if(!Util.isInGame() && document.querySelector('body>.stadiaplus_networkmonitor')) {
            this.closeMonitor();
        }
    }

    desandbox(javascript: string) {
        const script = document.createElement('script');
        script.innerHTML = javascript;
        document.body.appendChild(script);
        script.remove();
    }
}