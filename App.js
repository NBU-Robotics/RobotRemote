import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Button,
  TextInput,
  Alert,
  PermissionsAndroid,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {BleManager} from 'react-native-ble-plx';
import base64 from 'react-native-base64';

const manager = new BleManager();

const App = () => {
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const canUseBluetooth = () => locationEnabled && bluetoothEnabled;

  const sendErrorMessage = message =>
    Alert.alert('Error', message, [{text: 'OK'}], {cancelable: false});

  const requestBluetoothPermissions = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
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
      sendErrorMessage(err.message);
    }
  }, []);

  useEffect(() => {
    requestBluetoothPermissions();

    manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        setBluetoothEnabled(true);
      } else {
        setBluetoothEnabled(false);
      }
    }, true);
  }, [requestBluetoothPermissions]);

  const disconnect = async () => {
    await requestBluetoothPermissions();

    if (connectedDevice) {
      try {
        await manager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
      } catch (error) {
        sendErrorMessage(error.message);
      }
    }
  };

  const scan = async () => {
    await requestBluetoothPermissions();

    if (canUseBluetooth()) {
      await disconnect();

      setDevices([]);

      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          sendErrorMessage(error.message);

          return;
        }

        setDevices([...devices, device]);
      });
    }
  };

  const connect = async device => {
    await requestBluetoothPermissions();

    try {
      await disconnect();
      manager.stopDeviceScan();

      let someDevice = await manager.connectToDevice(device.id);
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
      sendErrorMessage(error.message);
    }
  };

  const onMessageChange = message => setDeviceMessage(message);

  const onSendMessagePress = async () => {
    await requestBluetoothPermissions();

    if (connectedDevice && connectedDevice.isConnected) {
      if (!connectedDevice.characteristicForWriting) {
        sendErrorMessage(
          `Device ${connectedDevice.name} (${
            connectedDevice.id
          }) is not writable.`,
        );

        return;
      }

      try {
        await connectedDevice.characteristicForWriting.writeWithoutResponse(
          base64.encode(deviceMessage + '\r'),
        );
      } catch (error) {
        sendErrorMessage(error.message);
      }
    } else {
      sendErrorMessage('Device is not connected!');
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
              {canUseBluetooth()
                ? 'Bluetooth is turned on.'
                : 'Please turn on bluetooth and location on your device.'}
            </Text>

            {canUseBluetooth() && (
              <Button title="Scan for devices" onPress={() => scan()} />
            )}
          </View>
          <View style={styles.sectionContainer}>
            {connectedDevice !== null && (
              <>
                <Text style={styles.sectionTitle}>
                  Connection to {connectedDevice.name} successful!
                </Text>
                <Button title="Disconnect" onPress={() => disconnect()} />
              </>
            )}
          </View>

          {devices.map(device => (
            <View style={styles.sectionContainer} key={device.id}>
              <Button
                disabled={connectedDevice !== null}
                title={device.name}
                onPress={() => connect(device)}
              />
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
