import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Button,
  TextInput,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import BluetoothSerial from 'react-native-bluetooth-serial';

const App = () => {
  const [displayError, setDisplayError] = useState('');
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  const disconnect = async () => {
    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
    } catch (error) {
      setDisplayError(error.message);
    }
  };

  const enable = async () => {
    try {
      await BluetoothSerial.enable();
      setBluetoothEnabled(true);
    } catch (error) {
      setDisplayError(error.message);
    }
  };

  useEffect(() => {
    enable();

    BluetoothSerial.on('error', err => setDisplayError(err.message));

    BluetoothSerial.on('connectionLost', () => {
      disconnect();
    });
  }, []);

  const scan = async () => {
    try {
      let scannedDevices = await BluetoothSerial.list();

      // Set blank device names to their device id
      for (var dev of scannedDevices) {
        if (!dev.name || dev.name.trim().length <= 0) {
          dev.name = String(dev.id);
        }
      }

      if (scannedDevices.length > 0) {
        setDevices([...scannedDevices]);
      }
    } catch (error) {
      setDisplayError(error.message);
    }
  };

  const connect = async device => {
    try {
      disconnect();

      setConnectedDevice(device);
      await BluetoothSerial.connect(device.id);
    } catch (error) {
      setDisplayError(error.message);
    }
  };

  const onMessageChange = message => setDeviceMessage(message);

  const onSendMessagePress = async () => {
    if (connectedDevice && BluetoothSerial.isConnected()) {
      await BluetoothSerial.write(deviceMessage + '\r');
    } else {
      setDisplayError('Device is not connected!');
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
              {bluetoothEnabled
                ? 'Bluetooth is turned on.'
                : 'Please turn on bluetooth on your device.'}
            </Text>

            {bluetoothEnabled && (
              <Button title="Scan for devices" onPress={() => scan()} />
            )}
          </View>
          <View style={styles.sectionContainer}>
            {displayError.length > 0 && (
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
