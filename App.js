import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
} from 'react-native';

import {Header, Colors} from 'react-native/Libraries/NewAppScreen';

import {BleManager} from 'react-native-ble-plx';

const manager = new BleManager();

const App = () => {
  const [scanError, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [canScan, setCanScan] = useState(false);

  const scanAndConnect = () => {
    if (canScan) {
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
    manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        setCanScan(true);
      } else {
        setCanScan(false);
      }
    }, true);
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <Header />
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {canScan ? 'Can scan' : 'Hello'}
              </Text>
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
    </>
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
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
