import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    StatusBar,
    useColorScheme,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StackScreenProps } from '@react-navigation/stack';

// API Configuration
const API_BASE_URL = 'http://10.0.2.2:8000/api'; // Untuk Android Emulator
// const API_BASE_URL = 'http://192.168.1.100:8000/api'; // Ganti dengan IP komputer lu
// const API_BASE_URL = 'http://localhost:8000/api'; // Untuk iOS Simulator

interface Karyawan {
    no_npk: string;
    nama: string;
    alamat: string;
    created_at: string;
    updated_at: string;
}

interface Item {
    id: number;
    kode: string;
    nama_item: string;
    harga: string;
    stok: number;
    created_at: string;
    updated_at: string;
}

interface Transaksi {
    id: number;
    npk: string;
    tanggal_transaksi: string;
    kode: string;
    qty: number;
    harga: string;
    bayar: boolean;
    created_at: string;
    updated_at: string;
    karyawan: Karyawan;
    item: Item;
}

interface FormData {
    npk: string;
    tanggal_transaksi: string;
    kode: string;
    qty: string;
    harga: string;
    bayar: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

type RootStackParamList = {
    MainTabs: {
        screen?: 'CreateTransaction' | 'TransactionList';
    };
    EditTransaction: {
        transactionId: number;
    };
};

type Props = StackScreenProps<RootStackParamList, 'EditTransaction'>;

// Helper function untuk format rupiah
const formatRupiah = (angka: number | string): string => {
    const number = typeof angka === 'string' ? parseFloat(angka) : angka;
    if (isNaN(number)) return 'Rp 0';
    return `Rp ${number.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
};

// Helper function untuk clean number input
const cleanNumber = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
};

function EditTransactionScreen({ route, navigation }: Props) {
    const { transactionId } = route.params;
    const isDarkMode = useColorScheme() === 'dark';

    // State for form data
    const [formData, setFormData] = useState<FormData>({
        npk: '',
        tanggal_transaksi: '',
        kode: '',
        qty: '',
        harga: '',
        bayar: true,
    });

    // State for dropdown data
    const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [originalTransaction, setOriginalTransaction] = useState<Transaksi | null>(null);

    // Loading states
    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);

    // Date picker states
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Load transaction data
    const loadTransaction = async (): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/transaksi/${transactionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<Transaksi> = await response.json();

            if (result.success && result.data) {
                const transaction = result.data;
                setOriginalTransaction(transaction);

                // Pre-fill form with existing data
                setFormData({
                    npk: transaction.npk,
                    tanggal_transaksi: transaction.tanggal_transaksi,
                    kode: transaction.kode,
                    qty: transaction.qty.toString(),
                    harga: Math.floor(parseFloat(transaction.harga)).toString(), // Clean decimal
                    bayar: transaction.bayar,
                });

                // Set selected date
                setSelectedDate(new Date(transaction.tanggal_transaksi));
            } else {
                Alert.alert('Error', 'Transaksi tidak ditemukan');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Transaction fetch error:', error);
            Alert.alert('Error', `Gagal memuat data transaksi: ${error}`);
            navigation.goBack();
        }
    };

    // Load employees data
    const loadKaryawans = async (): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/karyawan`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<Karyawan[]> = await response.json();
            if (result.success && result.data) {
                setKaryawans(result.data);
            }
        } catch (error) {
            console.error('Karyawan fetch error:', error);
            Alert.alert('Error', `Gagal memuat data karyawan: ${error}`);
        }
    };

    // Load items data
    const loadItems = async (): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<Item[]> = await response.json();
            if (result.success && result.data) {
                setItems(result.data);
            }
        } catch (error) {
            console.error('Items fetch error:', error);
            Alert.alert('Error', 'Gagal memuat data item');
        }
    };

    // Load all data on component mount
    useEffect(() => {
        const loadAllData = async () => {
            setInitialLoading(true);
            await Promise.all([
                loadTransaction(),
                loadKaryawans(),
                loadItems(),
            ]);
            setInitialLoading(false);
        };

        loadAllData();
    }, [transactionId]);

    // Handle form input changes
    const handleInputChange = (field: keyof FormData, value: string | boolean): void => {
        if (field === 'qty' && typeof value === 'string') {
            const cleanedValue = cleanNumber(value);
            setFormData(prev => ({
                ...prev,
                [field]: cleanedValue
            }));
        } else if (field === 'harga' && typeof value === 'string') {
            const cleanedValue = cleanNumber(value);
            setFormData(prev => ({
                ...prev,
                [field]: cleanedValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));

            // Auto-fill price when item is selected
            if (field === 'kode' && typeof value === 'string') {
                const selectedItem = items.find(item => item.kode === value);
                if (selectedItem) {
                    const cleanPrice = Math.floor(parseFloat(selectedItem.harga)).toString();
                    setFormData(prev => ({
                        ...prev,
                        harga: cleanPrice
                    }));
                }
            }
        }
    };

    // Handle form submission
    const handleSubmit = async (): Promise<void> => {
        // Validate required fields
        if (!formData.npk || !formData.tanggal_transaksi || !formData.kode || !formData.qty) {
            Alert.alert('Error', 'Semua field harus diisi');
            return;
        }

        // Validate quantity
        const qty = parseInt(formData.qty);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Error', 'Jumlah harus berupa angka positif');
            return;
        }

        // Validate price
        const harga = parseFloat(formData.harga);
        if (isNaN(harga) || harga <= 0) {
            Alert.alert('Error', 'Harga harus berupa angka positif');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/transaksi/${transactionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    npk: formData.npk,
                    tanggal_transaksi: formData.tanggal_transaksi,
                    kode: formData.kode,
                    qty: qty,
                    harga: harga,
                    bayar: formData.bayar,
                }),
            });

            const result: ApiResponse<any> = await response.json();

            if (result.success) {
                Alert.alert(
                    'Sukses',
                    result.message || 'Transaksi berhasil diperbarui',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate back to MainTabs and focus on TransactionList
                                navigation.navigate('MainTabs', {
                                    screen: 'TransactionList'
                                });
                            }
                        }
                    ]
                );
            } else {
                // Handle validation errors
                if (result.errors) {
                    const errorMessages = Object.values(result.errors).flat().join('\n');
                    Alert.alert('Error', errorMessages);
                } else {
                    Alert.alert('Error', result.message || 'Terjadi kesalahan saat memperbarui transaksi');
                }
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Gagal memperbarui data transaksi');
        } finally {
            setLoading(false);
        }
    };

    // Handle date change
    const handleDateChange = (event: any, date?: Date): void => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
            const formattedDate = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            handleInputChange('tanggal_transaksi', formattedDate);
        }
    };

    // Show date picker
    const showDatePickerModal = (): void => {
        setShowDatePicker(true);
    };

    // Reset form to original values
    const handleReset = (): void => {
        if (originalTransaction) {
            setFormData({
                npk: originalTransaction.npk,
                tanggal_transaksi: originalTransaction.tanggal_transaksi,
                kode: originalTransaction.kode,
                qty: originalTransaction.qty.toString(),
                harga: Math.floor(parseFloat(originalTransaction.harga)).toString(),
                bayar: originalTransaction.bayar,
            });
            setSelectedDate(new Date(originalTransaction.tanggal_transaksi));
        }
    };

    // Show loading screen while fetching initial data
    if (initialLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer, isDarkMode && styles.darkContainer]}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
                    Memuat data transaksi...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>← Kembali</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, isDarkMode && styles.darkText]}>
                        Edit Transaksi #{transactionId}
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Employee Dropdown */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Pilih Karyawan *
                    </Text>
                    <View style={[styles.pickerContainer, isDarkMode && styles.darkInput]}>
                        <Picker
                            selectedValue={formData.npk}
                            onValueChange={(value) => handleInputChange('npk', value)}
                            style={[styles.picker, isDarkMode && styles.darkText]}
                        >
                            <Picker.Item label="-- Pilih Karyawan --" value="" />
                            {karyawans.map((karyawan) => (
                                <Picker.Item
                                    key={karyawan.no_npk}
                                    label={`${karyawan.nama} (${karyawan.no_npk})`}
                                    value={karyawan.no_npk}
                                />
                            ))}
                        </Picker>
                    </View>

                    {/* Transaction Date */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Tanggal Transaksi *
                    </Text>
                    <TouchableOpacity
                        style={[styles.input, isDarkMode && styles.darkInput]}
                        onPress={showDatePickerModal}
                    >
                        <Text style={[styles.dateText, isDarkMode && styles.darkText, !formData.tanggal_transaksi && styles.placeholderText]}>
                            {formData.tanggal_transaksi || 'Pilih Tanggal'}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                        />
                    )}

                    {/* Item Dropdown */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Pilih Item *
                    </Text>
                    <View style={[styles.pickerContainer, isDarkMode && styles.darkInput]}>
                        <Picker
                            selectedValue={formData.kode}
                            onValueChange={(value) => handleInputChange('kode', value)}
                            style={[styles.picker, isDarkMode && styles.darkText]}
                        >
                            <Picker.Item label="-- Pilih Item --" value="" />
                            {items.map((item) => (
                                <Picker.Item
                                    key={item.kode}
                                    label={`${item.nama_item} (${item.kode}) - ${formatRupiah(item.harga)}`}
                                    value={item.kode}
                                />
                            ))}
                        </Picker>
                    </View>

                    {/* Quantity */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Jumlah *
                    </Text>
                    <TextInput
                        style={[styles.input, isDarkMode && styles.darkInput, isDarkMode && styles.darkText]}
                        placeholder="Masukkan jumlah"
                        placeholderTextColor={isDarkMode ? '#666' : '#999'}
                        value={formData.qty}
                        onChangeText={(value) => handleInputChange('qty', value)}
                        keyboardType="numeric"
                    />

                    {/* Price */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Harga *
                    </Text>
                    <View style={styles.priceInputContainer}>
                        <Text style={[styles.pricePrefix, isDarkMode && styles.darkText]}>Rp</Text>
                        <TextInput
                            style={[styles.priceInput, isDarkMode && styles.darkInput, isDarkMode && styles.darkText]}
                            placeholder="0"
                            placeholderTextColor={isDarkMode ? '#666' : '#999'}
                            value={formData.harga ? parseInt(formData.harga).toLocaleString('id-ID') : ''}
                            onChangeText={(value) => handleInputChange('harga', value)}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Payment Status */}
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Status Pembayaran *
                    </Text>
                    <View style={styles.radioContainer}>
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => handleInputChange('bayar', true)}
                        >
                            <View style={[styles.radioCircle, formData.bayar && styles.radioSelected]}>
                                {formData.bayar && <View style={styles.radioDot} />}
                            </View>
                            <Text style={[styles.radioLabel, isDarkMode && styles.darkText]}>
                                Lunas
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => handleInputChange('bayar', false)}
                        >
                            <View style={[styles.radioCircle, !formData.bayar && styles.radioSelected]}>
                                {!formData.bayar && <View style={styles.radioDot} />}
                            </View>
                            <Text style={[styles.radioLabel, isDarkMode && styles.darkText]}>
                                Cicil
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Total Display */}
                    {formData.qty && formData.harga && (
                        <View style={[styles.totalContainer, isDarkMode && styles.darkTotal]}>
                            <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>
                                Total:
                            </Text>
                            <Text style={[styles.totalAmount, isDarkMode && styles.darkText]}>
                                {formatRupiah(parseFloat(formData.harga) * parseInt(formData.qty || '0'))}
                            </Text>
                        </View>
                    )}

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Memperbarui...' : 'Perbarui Transaksi'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.resetButton]}
                            onPress={handleReset}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Reset ke Data Asli</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.buttonText}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    darkContainer: {
        backgroundColor: '#121212',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    backButton: {
        marginBottom: 10,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    darkText: {
        color: '#fff',
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    darkInput: {
        backgroundColor: '#2a2a2a',
        borderColor: '#444',
        color: '#fff',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    pricePrefix: {
        paddingLeft: 12,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    priceInput: {
        flex: 1,
        padding: 12,
        paddingLeft: 8,
        fontSize: 16,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    dateText: {
        fontSize: 16,
        paddingVertical: 4,
    },
    placeholderText: {
        color: '#999',
    },
    radioContainer: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 20,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#2196F3',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#2196F3',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2196F3',
    },
    radioLabel: {
        fontSize: 16,
        color: '#333',
    },
    totalContainer: {
        backgroundColor: '#f0f8ff',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    darkTotal: {
        backgroundColor: '#1a1a2e',
        borderLeftColor: '#4fc3f7',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    buttonContainer: {
        marginTop: 30,
        gap: 12,
    },
    button: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
    },
    resetButton: {
        backgroundColor: '#FF9800',
    },
    cancelButton: {
        backgroundColor: '#f44336',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditTransactionScreen;