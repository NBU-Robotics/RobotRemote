import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Button,
  PermissionsAndroid,
  TextInput,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import {BleManager} from 'react-native-ble-plx';
import base64 from 'react-native-base64';

const manager = new BleManager();

const App = () => {
  const [displayError, setDisplayError] = useState(null);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);

  const canScan = () => locationEnabled && bluetoothEnabled;

  useEffect(() => {
    const requestBluetoothPermissions = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          {
            title: 'Location permission',
            message:
              'Robot remote needs location permission in order to use bluetooth.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'No',
            buttonPositive: 'Yes',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationEnabled(true);
        } else {
          setLocationEnabled(false);
        }
      } catch (err) {
        setDisplayError(err.message);
      }
    };

    requestBluetoothPermissions();

    manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        setBluetoothEnabled(true);
      } else {
        setBluetoothEnabled(false);
      }
    }, true);
  }, []);

  const disconnect = () => {
    if (connectedDevice) {
      manager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
    }
  };

  const scan = () => {
    if (canScan()) {
      disconnect();
      manager.stopDeviceScan();

      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          setDisplayError(error);

          return;
        }

        setDevices([...devices, device]);
      });
    }
  };

  const connect = async device => {
    try {
      disconnect();

      let someDevice = await manager.connectToDevice(device.id);
      manager.stopDeviceScan();

      const deviceWithServices = await this.manager.discoverAllServicesAndCharacteristicsForDevice(
        someDevice.id,
      );

      const services = await deviceWithServices.services();
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const characteristics = await service.characteristics();
        for (let j = 0; j < characteristics.length; j++) {
          const characteristic = characteristics[j];
          if (characteristic.isWritableWithoutResponse) {
            someDevice.characteristicForWriting = characteristic;
          }
        }
      }

      setConnectedDevice(someDevice);
    } catch (error) {
      setDisplayError(error.message);
    }
  };

  const onMessageChange = message => setDeviceMessage(message);

  const onSendMessagePress = async () => {
    if (connectedDevice) {
      if (!connectedDevice.characteristicForWriting) {
        setDisplayError(
          `Device ${connectedDevice.name} (${
            connectedDevice.id
          }) is not writable.`,
        );

        return;
      }

      await connectedDevice.characteristicForWriting.writeWithoutResponse(
        base64.encode(deviceMessage + '\r'),
      );
    }
  };

  return (
    <SafeAreaView>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        <View style={styles.body}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {canScan()
                ? 'Bluetooth and location turned on.'
                : 'Please turn on bluetooth and location on your device.'}
            </Text>

            {canScan() && <Button title="Scan for devices" onPress={scan} />}
          </View>
          <View style={styles.sectionContainer}>
            {displayError ?? (
              <Text style={styles.sectionTitle}>{displayError}</Text>
            )}
            {connectedDevice !== null && (
              <Text style={styles.sectionTitle}>
                Connection to {connectedDevice.name} successful!
              </Text>
            )}
          </View>

          {devices.map(device => (
            <View style={styles.sectionContainer} key={device.id}>
              <Button title={device.name} onPress={() => connect(device)} />
            </View>
          ))}

          <View style={styles.sectionContainer}>
            {connectedDevice !== null && (
              <>
                <TextInput
                  placeholder="Type here the message to the connected device."
                  onChangeText={onMessageChange}
                  defaultValue={''}
                />
                <Button title="Send message" onPress={onSendMessagePress} />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
});

export default App;
