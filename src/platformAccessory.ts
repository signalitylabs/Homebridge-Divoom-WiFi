import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { HomebridgeDivoomWifi } from './platform';
import { RequestInfo, RequestInit } from 'node-fetch';

const fetch = (url: RequestInfo, init?: RequestInit) =>
  import('node-fetch').then(({ default: fetch }) => fetch(url, init));


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DivoomPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private divStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: HomebridgeDivoomWifi,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Divoom')
      .setCharacteristic(this.platform.Characteristic.Model, 'Wifi')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'x000');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.divDisplayName);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this));
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a display.
   */
  async setOn(value: CharacteristicValue) {
    this.divStates.On = value as boolean;

    const body = '{"Command":"Channel/OnOffScreen","OnOff": ' + (value ? '1' : '0') + '}';
    const response = await fetch('http://'+this.platform.config.DEVICE_IP+'/post', {
      method: 'post',
      body: body,
      headers: {'Content-Type': 'application/json'},
    });
    await response.json();
    this.service.updateCharacteristic(this.platform.Characteristic.On, value);

    //this.platform.log.debug('On Data ->', data);
    //this.platform.log.debug('Set Characteristic On ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   */
  async getOn(): Promise<CharacteristicValue> {
    let isOn = this.divStates.On;

    const body = {Command: 'Channel/GetAllConf'};
    const response = await fetch(`http://${this.platform.config.DEVICE_IP}/post`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
    });
    const data = await response.json();

    isOn = false;
    if(data.LightSwitch === 1) {
      isOn = true;
    }
    this.platform.log.debug('On Data ->', data);
    this.platform.log.debug('isOn ->', isOn);
    this.platform.log.debug('data.LightSwitch ->', data.LightSwitch);
    //this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    this.divStates.Brightness = value as number;

    const body = {Command: 'Channel/SetBrightness', Brightness: value};
    const response = await fetch(`http://${this.platform.config.DEVICE_IP}/post`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
    });
    await response.json();

    //this.platform.log.debug('Brightness Data ->', data);
    //this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

}
