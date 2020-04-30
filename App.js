import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  Button,
  PermissionsAndroid,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import {BleManager} from 'react-native-ble-plx';

const manager = new BleManager();

const App = () => {
  const [scanError, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  const canScan = () => locationEnabled && bluetoothEnabled;

  const scan = () => {
    if (canScan()) {
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          setError(error);

          return;
        }

        setDevices([...devices, device]);
      });
    }
  };

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
        console.warn(err);
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

            {canScan() && (
              <Button title="Scan for devices" onPress={() => scan()} />
            )}
          </View>
          {scanError ?? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{scanError}</Text>
            </View>
          )}
          {devices.map(device => (
            <View style={styles.sectionContainer} key={device.id}>
              <Text style={styles.sectionTitle}>{device.name}</Text>
            </View>
          ))}
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
