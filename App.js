/* eslint-disable no-unused-vars */
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
  DeviceEventEmitter,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import BluetoothSerial from 'react-native-bluetooth-serial-next';
import LocationServicesDialogBox from 'react-native-android-location-services-dialog-box';

const App = () => {
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [locationPermitted, setLocationPermitted] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const canUseBluetooth = () =>
    locationPermitted && bluetoothEnabled && locationEnabled;

  const canPressButtons = () =>
    !isDisconnecting && !isScanning && !isConnecting && !isSending;

  const sendErrorMessage = (message) =>
    Alert.alert('Error', message, [{text: 'OK'}], {cancelable: false});

  const sendAlertMessage = (message) =>
    Alert.alert('Alert!', message, [{text: 'OK'}], {cancelable: false});

  const requestLocation = useCallback(async () => {
    LocationServicesDialogBox.checkLocationServicesIsEnabled({
      message: 'Enable location services in order to use bluetooth?',
      ok: 'Yes',
      cancel: 'No',
      enableHighAccuracy: false,
      showDialog: true,
      openLocationServices: true,
      preventOutSideTouch: true,
      preventBackClick: true,
      providerListener: true,
    })
      .then(() => {
        setLocationEnabled(true);
      })
      .catch(() => {
        setLocationEnabled(false);
      });
  }, []);

  const requestLocationPermissions = useCallback(async () => {
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
        setLocationPermitted(true);
      } else {
        setLocationPermitted(false);
      }
    } catch (err) {
      sendErrorMessage(err.message);
    }
  }, []);

  useEffect(() => {
    DeviceEventEmitter.addListener('locationProviderStatusChange', function (
      status,
    ) {
      if (status.enabled) {
        setLocationEnabled(true);
      } else {
        setLocationEnabled(false);
      }
    });

    const enable = async () => {
      try {
        await BluetoothSerial.enable();
        setBluetoothEnabled(true);
      } catch (error) {
        sendErrorMessage(error.message);
      }
    };

    enable();

    BluetoothSerial.read((data, subscription) => {
      sendAlertMessage(data);
    }, '\r\n');

    return () => LocationServicesDialogBox.stopListener();
  }, []);

  useEffect(() => {
    const requestServices = async () => {
      await requestLocationPermissions();
      await requestLocation();
    };

    requestServices();
  }, [requestLocationPermissions, requestLocation]);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);

    await requestLocationPermissions();

    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
    } catch (error) {
      sendErrorMessage(error.message);
    }

    setIsDisconnecting(false);
  }, [requestLocationPermissions]);

  useEffect(() => {
    BluetoothSerial.on('connectionLost', () => {
      disconnect();
    });

    BluetoothSerial.on('bluetoothEnabled', () => {
      disconnect();
      setBluetoothEnabled(true);
    });

    BluetoothSerial.on('bluetoothDisabled', () => {
      disconnect();
      setBluetoothEnabled(false);
    });
  }, [disconnect]);

  const scan = async () => {
    setIsScanning(true);

    await requestLocationPermissions();

    if (canUseBluetooth()) {
      await disconnect();

      try {
        let scannedDevices = await BluetoothSerial.list();
        if (scannedDevices == null) {
          scannedDevices = [];
        }

        let unpaired = await BluetoothSerial.discoverUnpairedDevices();
        if (unpaired == null) {
          unpaired = [];
        }

        scannedDevices = [...scannedDevices, ...unpaired];

        // Set blank device names to their device id
        for (let dev of scannedDevices) {
          if (!dev.name || dev.name.trim().length <= 0) {
            dev.name = String(dev.id);
          }
        }

        let devicesToAdd = [];
        if (scannedDevices.length > 0) {
          for (let dev of scannedDevices) {
            if (!devicesToAdd.find((el) => el.id === dev.id)) {
              devicesToAdd.push(dev);
            }
          }
        }

        setDevices(devicesToAdd);
      } catch (error) {
        sendErrorMessage(error.message);
      }
    }

    setIsScanning(false);
  };

  const connect = async (device) => {
    setIsConnecting(true);

    await requestLocationPermissions();

    try {
      await BluetoothSerial.connect(device.id);
      setConnectedDevice(device);
    } catch (error) {
      sendErrorMessage(error.message);
    }

    setIsConnecting(false);
  };

  const onMessageChange = (message) => setDeviceMessage(message);

  const onSendMessagePress = async () => {
    setIsSending(true);

    if (connectedDevice && BluetoothSerial.isConnected()) {
      await BluetoothSerial.write(deviceMessage + '\r');
    } else {
      sendErrorMessage('Device is not connected!');
    }

    setIsSending(false);
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
                ? 'Bluetooth and location are turned on.'
                : 'Please turn on bluetooth and location on your device.'}
            </Text>

            {canUseBluetooth() && (
              <Button
                title="Scan for devices"
                disabled={!canPressButtons()}
                onPress={() => scan()}
              />
            )}
          </View>

          {canUseBluetooth() && (
            <View style={styles.sectionContainer}>
              {connectedDevice !== null && (
                <>
                  <Text style={styles.sectionTitle}>
                    Connection to {connectedDevice.name} successful!
                  </Text>
                  <Button
                    disabled={!canPressButtons()}
                    title="Disconnect"
                    onPress={() => disconnect()}
                  />
                </>
              )}
            </View>
          )}

          {canUseBluetooth() &&
            devices.map((device) => (
              <View style={styles.sectionContainer} key={device.id}>
                <Button
                  disabled={!canPressButtons() || connectedDevice !== null}
                  title={device.name}
                  onPress={() => connect(device)}
                />
              </View>
            ))}

          {canUseBluetooth() && (
            <View style={styles.sectionContainer}>
              {connectedDevice !== null && (
                <>
                  <TextInput
                    placeholder="Type here the message to the connected device."
                    onChangeText={onMessageChange}
                    defaultValue={''}
                  />
                  <Button
                    title="Send message"
                    disabled={!canPressButtons()}
                    onPress={onSendMessagePress}
                  />
                </>
              )}
            </View>
          )}
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
