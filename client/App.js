// client/App.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
// Import funkcí z naší socketService
import { buzz, resetBuzzer, onBuzzerWinner, onBuzzerReset, offBuzzerWinner, offBuzzerReset } from './services/socketService';

export default function App() {
  // State pro uložení informací o aktuálním vítězi
  // Bude to objekt { id: 'socketId', time: 'timestamp' } nebo null
  const [currentWinner, setCurrentWinner] = useState(null);

  // useEffect se spustí po prvním renderu komponenty a při jejím zrušení (unmount)
  useEffect(() => {
    // Nastavení posluchačů pro události ze serveru
    onBuzzerWinner((winner) => {
      setCurrentWinner(winner); // Ulož vítěze do state
      // Volitelně: zobraz notifikaci o vítězi
      Alert.alert('Vítěz!', `Bzučel: ${winner.id}`);
    });

    onBuzzerReset(() => {
      setCurrentWinner(null); // Resetuj vítěze
      Alert.alert('Bzučák resetován!', 'Můžete začít znovu.');
    });

    // Cleanup funkce: Tato část se spustí, když se komponenta odmontuje.
    // Důležité pro zamezení úniků paměti a správné chování.
    return () => {
      offBuzzerWinner(); // Odstranění posluchače pro událost 'buzzerWinner'
      offBuzzerReset(); // Odstranění posluchače pro událost 'buzzerReset'
    };
  }, []); // Prázdné pole závislostí zajistí, že se useEffect spustí jen jednou (při mountu a unmountu)

  // Handler pro stisknutí tlačítka BZUČÁK
  const handleBuzzPress = () => {
    buzz(); // Zavolá funkci z socketService, která odešle 'buzz' na server
  };

  // Handler pro stisknutí tlačítka RESET
  const handleResetPress = () => {
    resetBuzzer(); // Zavolá funkci z socketService, která odešle 'resetBuzzer' na server
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bzučáková Aplikace</Text>

      {/* Tlačítko Bzučáku */}
      <TouchableOpacity
        style={styles.buzzerButton}
        onPress={handleBuzzPress}
        disabled={!!currentWinner} // Tlačítko je zakázané, pokud už je nějaký vítěz (!! převádí na boolean)
      >
        <Text style={styles.buttonText}>BUZZ!</Text>
      </TouchableOpacity>

      {/* Zobrazení vítěze (podmíněné renderování: zobrazí se jen když je currentWinner) */}
      {currentWinner && (
        <View style={styles.winnerContainer}>
          <Text style={styles.winnerText}>Vítěz kola:</Text>
          <Text style={styles.winnerId}>{currentWinner.id}</Text>
          <Text style={styles.winnerTextSmall}>
            (Bzučel v: {new Date(currentWinner.time).toLocaleTimeString()})
          </Text>
        </View>
      )}

      {/* Tlačítko Reset */}
      <TouchableOpacity
        style={[styles.resetButton, !currentWinner && styles.resetButtonDisabled]}
        onPress={handleResetPress}
        disabled={!currentWinner} // Tlačítko je zakázané, pokud není co resetovat (žádný vítěz)
      >
        <Text style={styles.buttonText}>Reset Bzučáku</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styly pro komponenty
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  buzzerButton: {
    width: 200,
    height: 200,
    borderRadius: 100, // Kruhové tlačítko
    backgroundColor: '#FF6347', // Oranžová barva
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8, // Android stín
  },
  buttonText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  winnerContainer: {
    backgroundColor: '#4CAF50', // Zelená barva pro vítěze
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  winnerId: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  winnerTextSmall: {
    fontSize: 14,
    color: '#eee',
  },
  resetButton: {
    backgroundColor: '#6A5ACD', // Fialová barva pro reset
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonDisabled: {
    backgroundColor: '#999', // Šedá barva pro neaktivní tlačítko
  },
});