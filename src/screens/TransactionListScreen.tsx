import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    StatusBar,
    useColorScheme,
    Platform,
    FlatList,
    RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../App';
import Icon from 'react-native-vector-icons/MaterialIcons';

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

interface PaginationData {
    current_page: number;
    data: Transaksi[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

interface ApiResponse {
    success: boolean;
    data?: PaginationData;
    message?: string;
    filters?: Record<string, string>;
}

interface FilterData {
    start_date: string;
    end_date: string;
    bayar: string;
    npk: string;
}

type Props = BottomTabScreenProps<RootTabParamList, 'TransactionList'>;

function TransactionListScreen({ navigation }: Props) {
    const isDarkMode = useColorScheme() === 'dark';

    // State for transactions and pagination
    const [transactions, setTransactions] = useState<Transaksi[]>([]);
    const [pagination, setPagination] = useState<PaginationData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<number | null>(null);

    // State for filters
    const [filters, setFilters] = useState<FilterData>({
        start_date: '',
        end_date: '',
        bayar: '',
        npk: '',
    });

    // State for dropdown data
    const [karyawans, setKaryawans] = useState<Karyawan[]>([]);

    // State for date pickers
    const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
    const [selectedStartDate, setSelectedStartDate] = useState<Date>(new Date());
    const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date());

    // Load data on component mount
    useEffect(() => {
        loadKaryawans();
        loadTransactions();
    }, []);

    // Focus listener to refresh data when tab is focused
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Refresh transactions when screen is focused
            loadTransactions(1);
        });

        return unsubscribe;
    }, [navigation, filters]);

    // Load employees data for filter
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

            const result = await response.json();
            if (result.success && result.data) {
                setKaryawans(result.data);
            }
        } catch (error) {
            console.error('Karyawan fetch error:', error);
            Alert.alert('Error', `Gagal memuat data karyawan: ${error}`);
        }
    };

    // Build query params from filters
    const buildQueryParams = (): string => {
        const params = new URLSearchParams();

        // Only add params if they have values
        if (filters.start_date.trim()) {
            params.append('start_date', filters.start_date);
        }

        if (filters.end_date.trim()) {
            params.append('end_date', filters.end_date);
        }

        if (filters.bayar.trim()) {
            params.append('bayar', filters.bayar);
        }

        if (filters.npk.trim()) {
            params.append('npk', filters.npk);
        }

        const queryString = params.toString();
        return queryString ? `?${queryString}` : '';
    };

    // Load transactions with filters
    const loadTransactions = async (page: number = 1): Promise<void> => {
        setLoading(true);
        try {
            const queryParams = buildQueryParams();
            const pageParam = queryParams ? `&page=${page}` : `?page=${page}`;
            const url = `${API_BASE_URL}/transaksi${queryParams}${pageParam}`;

            console.log('Fetching transactions from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ApiResponse = await response.json();
            console.log('Response data:', result);

            if (result.success && result.data) {
                if (page === 1) {
                    setTransactions(result.data.data);
                } else {
                    setTransactions(prev => [...prev, ...result.data!.data]);
                }
                setPagination(result.data);
            }
        } catch (error) {
            console.error('Transaction fetch error:', error);
            Alert.alert('Error', `Gagal memuat data transaksi: ${error}`);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Delete transaction
    const deleteTransaction = async (transactionId: number): Promise<void> => {
        setDeleting(transactionId);
        try {
            const response = await fetch(`${API_BASE_URL}/transaksi/${transactionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Remove transaction from local state
                setTransactions(prev => prev.filter(t => t.id !== transactionId));

                // Update pagination total count
                if (pagination) {
                    setPagination(prev => prev ? {
                        ...prev,
                        total: prev.total - 1
                    } : null);
                }

                Alert.alert('Sukses', 'Transaksi berhasil dihapus');
            } else {
                throw new Error(result.message || 'Gagal menghapus transaksi');
            }
        } catch (error) {
            console.error('Delete transaction error:', error);
            Alert.alert('Error', `Gagal menghapus transaksi: ${error}`);
        } finally {
            setDeleting(null);
        }
    };

    // Show delete confirmation popup
    const showDeleteConfirmation = (transaction: Transaksi): void => {
        Alert.alert(
            'Konfirmasi Hapus',
            `Apakah Anda yakin ingin menghapus transaksi #${transaction.id}?\n\nKaryawan: ${transaction.karyawan.nama}\nItem: ${transaction.item.nama_item}\nTotal: ${formatCurrency((parseFloat(transaction.harga) * transaction.qty).toString())}`,
            [
                {
                    text: 'Batal',
                    style: 'cancel',
                },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: () => deleteTransaction(transaction.id),
                },
            ],
            { cancelable: true }
        );
    };

    // Handle filter changes
    const handleFilterChange = (field: keyof FilterData, value: string): void => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Apply filters
    const applyFilters = (): void => {
        loadTransactions(1);
    };

    // Reset filters
    const resetFilters = (): void => {
        setFilters({
            start_date: '',
            end_date: '',
            bayar: '',
            npk: '',
        });
        setSelectedStartDate(new Date());
        setSelectedEndDate(new Date());
        // Auto apply after reset
        setTimeout(() => {
            loadTransactions(1);
        }, 100);
    };

    // Load more transactions (pagination)
    const loadMore = (): void => {
        if (pagination && pagination.next_page_url && !loading) {
            loadTransactions(pagination.current_page + 1);
        }
    };

    // Refresh transactions
    const onRefresh = (): void => {
        setRefreshing(true);
        loadTransactions(1);
    };

    // Handle start date change
    const handleStartDateChange = (event: any, date?: Date): void => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedStartDate(date);
            const formattedDate = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            handleFilterChange('start_date', formattedDate);
        }
    };

    // Handle end date change
    const handleEndDateChange = (event: any, date?: Date): void => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedEndDate(date);
            const formattedDate = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            handleFilterChange('end_date', formattedDate);
        }
    };

    // Navigate to edit transaction screen
    const handleEditTransaction = (transactionId: number): void => {
        // Navigate to EditTransaction screen with transaction ID
        (navigation as any).navigate('EditTransaction', {
            transactionId: transactionId,
        });
    };

    // Format currency
    const formatCurrency = (amount: string): string => {
        return `Rp ${parseFloat(amount).toLocaleString('id-ID')}`;
    };

    // Format date
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Render transaction item
    const renderTransactionItem = ({ item }: { item: Transaksi }) => (
        <View style={[styles.transactionCard, isDarkMode && styles.darkCard]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.transactionId, isDarkMode && styles.darkText]}>
                    #{item.id}
                </Text>
                <View style={styles.cardHeaderRight}>
                    <View style={[
                        styles.statusBadge,
                        item.bayar ? styles.paidBadge : styles.unpaidBadge
                    ]}>
                        <Text style={styles.statusText}>
                            {item.bayar ? 'Lunas' : 'Cicil'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.editButton, isDarkMode && styles.darkEditButton]}
                        onPress={() => handleEditTransaction(item.id)}
                    >
                        <Icon name="edit" size={20} color={isDarkMode ? '#fff' : '#2196F3'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.deleteButton, isDarkMode && styles.darkDeleteButton]}
                        onPress={() => showDeleteConfirmation(item)}
                        disabled={deleting === item.id}
                    >
                        <Icon
                            name={deleting === item.id ? "hourglass-empty" : "delete"}
                            size={20}
                            color={isDarkMode ? '#fff' : '#f44336'}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={[styles.employeeName, isDarkMode && styles.darkText]}>
                {item.karyawan.nama} ({item.karyawan.no_npk})
            </Text>

            <Text style={[styles.itemName, isDarkMode && styles.darkText]}>
                {item.item.nama_item} ({item.item.kode})
            </Text>

            <View style={styles.transactionDetails}>
                <Text style={[styles.detailText, isDarkMode && styles.darkText]}>
                    Qty: {item.qty}
                </Text>
                <Text style={[styles.detailText, isDarkMode && styles.darkText]}>
                    Harga: {formatCurrency(item.harga)}
                </Text>
                <Text style={[styles.detailText, isDarkMode && styles.darkText]}>
                    Total: {formatCurrency((parseFloat(item.harga) * item.qty).toString())}
                </Text>
            </View>

            <Text style={[styles.transactionDate, isDarkMode && styles.darkText]}>
                {formatDate(item.tanggal_transaksi)}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>
                    Daftar Transaksi
                </Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('CreateTransaction')}
                >
                    <Text style={styles.createButtonText}>+ Buat Transaksi</Text>
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
                <View style={styles.filtersContent}>
                    {/* Start Date Filter */}
                    <View style={styles.filterItem}>
                        <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>
                            Dari Tanggal
                        </Text>
                        <TouchableOpacity
                            style={[styles.filterInput, isDarkMode && styles.darkInput]}
                            onPress={() => setShowStartDatePicker(true)}
                        >
                            <Text style={[styles.filterText, isDarkMode && styles.darkText, !filters.start_date && styles.placeholderText]}>
                                {filters.start_date || 'Pilih Tanggal'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* End Date Filter */}
                    <View style={styles.filterItem}>
                        <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>
                            Sampai Tanggal
                        </Text>
                        <TouchableOpacity
                            style={[styles.filterInput, isDarkMode && styles.darkInput]}
                            onPress={() => setShowEndDatePicker(true)}
                        >
                            <Text style={[styles.filterText, isDarkMode && styles.darkText, !filters.end_date && styles.placeholderText]}>
                                {filters.end_date || 'Pilih Tanggal'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Payment Status Filter */}
                    <View style={styles.filterItem}>
                        <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>
                            Status Bayar
                        </Text>
                        <View style={[styles.pickerContainer, isDarkMode && styles.darkInput]}>
                            <Picker
                                selectedValue={filters.bayar}
                                onValueChange={(value) => handleFilterChange('bayar', value)}
                                style={[styles.picker, isDarkMode && styles.darkInput]}
                                dropdownIconColor={isDarkMode ? '#fff' : '#333'}
                            >
                                <Picker.Item
                                    label="Semua"
                                    value=""
                                    color={isDarkMode ? '#fff' : '#333'}
                                />
                                <Picker.Item
                                    label="Lunas"
                                    value="true"
                                    color={isDarkMode ? '#fff' : '#333'}
                                />
                                <Picker.Item
                                    label="Cicil"
                                    value="false"
                                    color={isDarkMode ? '#fff' : '#333'}
                                />
                            </Picker>
                        </View>
                    </View>

                    {/* Employee Filter */}
                    <View style={styles.filterItem}>
                        <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>
                            Karyawan
                        </Text>
                        <View style={[styles.pickerContainer, isDarkMode && styles.darkInput]}>
                            <Picker
                                selectedValue={filters.npk}
                                onValueChange={(value) => handleFilterChange('npk', value)}
                                style={[styles.picker, isDarkMode && styles.darkText]}
                            >
                                <Picker.Item label="Semua Karyawan" value="" />
                                {karyawans.map((karyawan) => (
                                    <Picker.Item
                                        key={karyawan.no_npk}
                                        label={`${karyawan.nama} (${karyawan.no_npk})`}
                                        value={karyawan.no_npk}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
                <TouchableOpacity
                    style={[styles.filterButton, styles.applyButton]}
                    onPress={applyFilters}
                >
                    <Text style={styles.filterButtonText}>Terapkan Filter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, styles.resetButton]}
                    onPress={resetFilters}
                >
                    <Text style={styles.filterButtonText}>Reset</Text>
                </TouchableOpacity>
            </View>

            {/* Transaction Summary */}
            {pagination && (
                <View style={[styles.summaryContainer, isDarkMode && styles.darkSummary]}>
                    <Text style={[styles.summaryText, isDarkMode && styles.darkText]}>
                        Total: {pagination.total} transaksi
                    </Text>
                    {pagination.total > 0 && (
                        <Text style={[styles.summaryText, isDarkMode && styles.darkText]}>
                            Halaman {pagination.current_page} dari {pagination.last_page}
                        </Text>
                    )}
                </View>
            )}

            {/* Transaction List */}
            <FlatList
                data={transactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.transactionsList}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={() => {
                    if (loading && transactions.length > 0) {
                        return (
                            <View style={styles.loadingFooter}>
                                <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
                                    Memuat lebih banyak...
                                </Text>
                            </View>
                        );
                    }
                    return null;
                }}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
                            {loading ? 'Memuat transaksi...' : 'Tidak ada transaksi'}
                        </Text>
                        {!loading && (
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => navigation.navigate('CreateTransaction')}
                            >
                                <Text style={styles.emptyButtonText}>Buat Transaksi Pertama</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />

            {/* Date Pickers */}
            {showStartDatePicker && (
                <DateTimePicker
                    value={selectedStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleStartDateChange}
                />
            )}

            {showEndDatePicker && (
                <DateTimePicker
                    value={selectedEndDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEndDateChange}
                />
            )}
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
    header: {
        backgroundColor: '#2196F3',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    createButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    darkText: {
        color: '#fff',
    },
    filtersContainer: {
        backgroundColor: '#fff',
        maxHeight: 120,
    },
    filtersContent: {
        flexDirection: 'row',
        padding: 16,
        gap: 16,
    },
    filterItem: {
        minWidth: 150,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        minHeight: 44,
        justifyContent: 'center',
    },
    darkInput: {
        backgroundColor: '#2a2a2a',
        borderColor: '#444',
    },
    filterText: {
        fontSize: 14,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        minHeight: 50,
    },
    picker: {
        backgroundColor: 'transparent',
        color: '#333',
        height: 50,
    },
    darkPicker: {
        backgroundColor: '#fff',
        borderColor: '#444',
    },
    filterActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    applyButton: {
        backgroundColor: '#4CAF50',
    },
    resetButton: {
        backgroundColor: '#FF9800',
    },
    filterButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    summaryContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    darkSummary: {
        backgroundColor: '#2a2a2a',
        borderBottomColor: '#444',
    },
    summaryText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    transactionsList: {
        flex: 1,
        padding: 16,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    darkCard: {
        backgroundColor: '#2a2a2a',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    transactionId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    paidBadge: {
        backgroundColor: '#4CAF50',
    },
    unpaidBadge: {
        backgroundColor: '#FF9800',
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    darkEditButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    darkDeleteButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    transactionDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#333',
    },
    transactionDate: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    loadingFooter: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TransactionListScreen;