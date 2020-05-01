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
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import BluetoothSerial from 'react-native-bluetooth-serial-next';

const App = () => {
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  const sendErrorMessage = message =>
    Alert.alert('Error', message, [{text: 'OK'}], {cancelable: false});

  const disconnect = useCallback(async () => {
    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
    } catch (error) {
      sendErrorMessage(error.message);
    }
  }, []);

  useEffect(() => {
    const enable = async () => {
      try {
        await BluetoothSerial.enable();
        setBluetoothEnabled(true);
      } catch (error) {
        sendErrorMessage(error.message);
      }
    };

    enable();
  }, []);

  useEffect(() => {
    BluetoothSerial.on('connectionLost', () => {
      disconnect();
    });

    BluetoothSerial.on('error', err => {
      sendErrorMessage(err.message);
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
      sendErrorMessage(error.message);
    }
  };

  const connect = async device => {
    try {
      await BluetoothSerial.connect(device.id);
      setConnectedDevice(device);
    } catch (error) {
      sendErrorMessage(error.message);
    }
  };

  const onMessageChange = message => setDeviceMessage(message);

  const onSendMessagePress = async () => {
    if (connectedDevice && BluetoothSerial.isConnected()) {
      await BluetoothSerial.write(deviceMessage + '\r');
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
              {bluetoothEnabled
                ? 'Bluetooth is turned on.'
                : 'Please turn on bluetooth on your device.'}
            </Text>

            {bluetoothEnabled && (
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
