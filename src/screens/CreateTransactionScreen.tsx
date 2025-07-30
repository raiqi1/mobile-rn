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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../App';

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

type Props = BottomTabScreenProps<RootTabParamList, 'CreateTransaction'>;

function CreateTransactionScreen({ navigation }: Props) {
    const isDarkMode = useColorScheme() === 'dark';

    // State for form data
    const [formData, setFormData] = useState<FormData>({
        npk: '',
        tanggal_transaksi: '',
        kode: '',
        qty: '',
        harga: '',
        bayar: true, // Default lunas
    });

    // State for dropdown data
    const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Helper function to format currency in Indonesian Rupiah
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Helper function to format number with thousand separators
    const formatNumber = (amount: number): string => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    // Calculate total amount
    const calculateTotal = (): number => {
        const qty = parseInt(formData.qty) || 0;
        const harga = parseFloat(formData.harga) || 0;
        return qty * harga;
    };

    // Load employees data
    const loadKaryawans = async (): Promise<void> => {
        try {
            console.log('Fetching karyawans from:', `${API_BASE_URL}/karyawan`);
            const response = await fetch(`${API_BASE_URL}/karyawan`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse<Karyawan[]> = await response.json();
            console.log('Response data:', result);
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
            const response = await fetch(`${API_BASE_URL}/items`);
            const result: ApiResponse<Item[]> = await response.json();
            if (result.success && result.data) {
                setItems(result.data);
            }
        } catch (error) {
            Alert.alert('Error', 'Gagal memuat data item');
        }
    };

    // Load data on component mount
    useEffect(() => {
        loadKaryawans();
        loadItems();
    }, []);

    // Handle form input changes
    const handleInputChange = (field: keyof FormData, value: string | boolean): void => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-fill price when item is selected
        if (field === 'kode' && typeof value === 'string') {
            const selectedItem = items.find(item => item.kode === value);
            if (selectedItem) {
                setFormData(prev => ({
                    ...prev,
                    harga: selectedItem.harga.toString()
                }));
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

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/transaksi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    npk: formData.npk,
                    tanggal_transaksi: formData.tanggal_transaksi,
                    kode: formData.kode,
                    qty: parseInt(formData.qty),
                    harga: parseFloat(formData.harga),
                    bayar: formData.bayar,
                }),
            });

            const result: ApiResponse<any> = await response.json();

            if (result.success) {
                Alert.alert(
                    'Sukses',
                    result.message || 'Transaksi berhasil ditambahkan',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Reset form
                                handleReset();
                                // Optional: Navigate to transaction list
                                // navigation.navigate('TransactionList');
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
                    Alert.alert('Error', result.message || 'Terjadi kesalahan');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Gagal mengirim data transaksi');
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

    // Reset form
    const handleReset = (): void => {
        setFormData({
            npk: '',
            tanggal_transaksi: '',
            kode: '',
            qty: '',
            harga: '',
            bayar: true, // Default ke lunas
        });
        setSelectedDate(new Date());
    };

    return (
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <Text style={[styles.title, isDarkMode && styles.darkText]}>
                        Form Transaksi
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
                                    label={`${item.nama_item} (${item.kode}) - ${formatCurrency(parseFloat(item.harga))}`}
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
                        Harga Satuan
                    </Text>
                    <TextInput
                        style={[styles.input, isDarkMode && styles.darkInput, isDarkMode && styles.darkText]}
                        placeholder="Harga akan otomatis terisi"
                        placeholderTextColor={isDarkMode ? '#666' : '#999'}
                        value={formData.harga ? formatCurrency(parseFloat(formData.harga)) : ''}
                        editable={false}
                    />

                    {/* Total Amount */}
                    {formData.qty && formData.harga && (
                        <>
                            <Text style={[styles.label, isDarkMode && styles.darkText]}>
                                Total Harga
                            </Text>
                            <View style={[styles.totalContainer, isDarkMode && styles.darkTotalContainer]}>
                                <Text style={[styles.totalText, isDarkMode && styles.darkText]}>
                                    {formatCurrency(calculateTotal())}
                                </Text>
                            </View>
                        </>
                    )}

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

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.resetButton]}
                            onPress={handleReset}
                        >
                            <Text style={styles.buttonText}>Reset Form</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.listButton]}
                            onPress={() => navigation.navigate('TransactionList')}
                        >
                            <Text style={styles.buttonText}>Lihat Daftar Transaksi</Text>
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
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#2196F3',
        padding: 20,
        alignItems: 'center',
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
    dateText: {
        fontSize: 16,
        paddingVertical: 4,
    },
    placeholderText: {
        color: '#999',
    },
    totalContainer: {
        backgroundColor: '#e8f5e8',
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    darkTotalContainer: {
        backgroundColor: '#1a4d1a',
        borderColor: '#66bb6a',
    },
    totalText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2e7d32',
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
    listButton: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateTransactionScreen;