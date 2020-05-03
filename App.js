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
import BluetoothSerial from 'react-native-bluetooth-serial';

const App = () => {
  const [deviceMessage, setDeviceMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const canPressButtons = () =>
    !isDisconnecting && !isScanning && !isConnecting && !isSending;

  const sendErrorMessage = message =>
    Alert.alert('Error', message, [{text: 'OK'}], {cancelable: false});

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

    BluetoothSerial.on('error', err => {
      sendErrorMessage(err.message);
    });
  }, []);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);

    try {
      await BluetoothSerial.disconnect();
      setConnectedDevice(null);
    } catch (error) {
      sendErrorMessage(error.message);
    }

    setIsDisconnecting(false);
  }, []);

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

    if (bluetoothEnabled) {
      await disconnect();

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
    }

    setIsScanning(false);
  };

  const connect = async device => {
    setIsConnecting(true);

    try {
      await BluetoothSerial.connect(device.id);
      setConnectedDevice(device);
    } catch (error) {
      sendErrorMessage(error.message);
    }

    setIsConnecting(false);
  };

  const onMessageChange = message => setDeviceMessage(message);

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
              {bluetoothEnabled
                ? 'Bluetooth is turned on.'
                : 'Please turn on bluetooth on your device.'}
            </Text>

            {bluetoothEnabled && (
              <Button
                title="Scan for devices"
                disabled={!canPressButtons()}
                onPress={() => scan()}
              />
            )}
          </View>

          {bluetoothEnabled && (
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

          {bluetoothEnabled &&
            devices.map(device => (
              <View style={styles.sectionContainer} key={device.id}>
                <Button
                  disabled={!canPressButtons() || connectedDevice !== null}
                  title={device.name}
                  onPress={() => connect(device)}
                />
              </View>
            ))}

          {bluetoothEnabled && (
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
