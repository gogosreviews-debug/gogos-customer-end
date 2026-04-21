import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLoggedInRole } from '@/services/auth-jwt';
import { clearTokens } from '@/services/auth-storage';
import {
    fetchWaiterNameIdList,
    ReviewPayload,
    submitReview,
    WaiterNameIdOption,
} from '@/services/review-form-api';

const BRAND_COLOR = '#7A1E2C';
const STAR_COLORS: Record<number, string> = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#eab308', // yellow
  4: '#86efac', // light green
  5: '#16a34a', // dark green
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAKISTANI_PHONE_REGEX = /^03\d{9}$/;
const LIKED_MOST_OPTIONS = ['Food quality', 'Taste', 'Service', 'Ambience', 'Cleanliness'];
const WHAT_WENT_WRONG_OPTIONS = ['Slow Service', 'Food issue', 'Staff', 'Cleanliness', 'Other'];
const WHAT_DID_YOU_LOVE_OPTIONS = ['Burger', 'Fries', 'Drinks', 'Service', 'Vibe'];

type RatingValue = 1 | 2 | 3 | 4 | 5;

type FormState = {
  name: string;
  email: string;
  phone: string;
  overallExperience: RatingValue | null;
  likedMost: string[];
  ratings: {
    foodQuality: RatingValue | null;
    service: RatingValue | null;
    ambiance: RatingValue | null;
    environment: RatingValue | null;
  };
  whatWentWrong: string[];
  whatWentWrongDetails: string;
  whatDidYouLove: string[];
  servedBy: string;
  rateWaiter: RatingValue | null;
  additionalComments: string;
};

type ValidationErrors = {
  name?: string;
  email?: string;
  phone?: string;
  overallExperience?: string;
  likedMost?: string;
  foodQuality?: string;
  service?: string;
  ambiance?: string;
  environment?: string;
  whatWentWrong?: string;
  whatWentWrongDetails?: string;
  servedBy?: string;
  rateWaiter?: string;
};

const INITIAL_FORM_STATE: FormState = {
  name: '',
  email: '',
  phone: '',
  overallExperience: null,
  likedMost: [],
  ratings: {
    foodQuality: null,
    service: null,
    ambiance: null,
    environment: null,
  },
  whatWentWrong: [],
  whatWentWrongDetails: '',
  whatDidYouLove: [],
  servedBy: '',
  rateWaiter: null,
  additionalComments: '',
};

function toggleSelection(currentValues: string[], value: string) {
  return currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];
}

function RatingSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RatingValue | null;
  onChange: (nextValue: RatingValue) => void;
}) {
  return (
    <View style={styles.ratingBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((item) => {
          const rating = item as RatingValue;
          const filled = item <= (value ?? 0);
          const selectedColor = value ? STAR_COLORS[value] : '#cbd5e1';
          const starColor = filled ? selectedColor : '#cbd5e1';

          return (
            <Pressable key={item} onPress={() => onChange(rating)} style={styles.starButton}>
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={24}
                color={starColor}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ChipGroup({
  options,
  selectedValues,
  onToggle,
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={styles.chipContainer}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option);

        return (
          <Pressable
            key={option}
            onPress={() => onToggle(option)}
            style={[styles.chip, isSelected ? styles.chipSelected : null]}>
            <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildValidationErrors(
  form: FormState,
  waiterOptions: WaiterNameIdOption[],
  waiterLoadError: string | null,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!PAKISTANI_PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = 'Enter a valid Pakistani phone number (03xxxxxxxxx).';
  }

  if (!form.overallExperience) {
    errors.overallExperience = 'Overall experience rating is required.';
  }

  if (form.likedMost.length === 0) {
    errors.likedMost = 'Select at least one option.';
  }

  if (!form.ratings.foodQuality) {
    errors.foodQuality = 'Food Quality rating is required.';
  }

  if (!form.ratings.service) {
    errors.service = 'Service rating is required.';
  }

  if (!form.ratings.ambiance) {
    errors.ambiance = 'Ambiance rating is required.';
  }

  if (!form.ratings.environment) {
    errors.environment = 'Environment rating is required.';
  }

  const detailRatings = Object.values(form.ratings);
  const hasAllDetailedRatings = detailRatings.every(Boolean);
  const shouldShowWhatWentWrong =
    hasAllDetailedRatings && detailRatings.some((rating) => (rating ?? 0) <= 3);

  if (shouldShowWhatWentWrong && form.whatWentWrong.length === 0) {
    errors.whatWentWrong = 'Select at least one issue.';
  }

  if (
    shouldShowWhatWentWrong &&
    form.whatWentWrong.includes('Other') &&
    !form.whatWentWrongDetails.trim()
  ) {
    errors.whatWentWrongDetails = 'Please specify what went wrong.';
  }

  if (!form.servedBy) {
    errors.servedBy = waiterLoadError
      ? 'Waiter list could not be loaded.'
      : 'Please select who served you today.';
  } else if (!waiterOptions.some((option) => option._id === form.servedBy)) {
    errors.servedBy = 'Select a valid waiter from the list.';
  }

  if (!form.rateWaiter) {
    errors.rateWaiter = 'Waiter rating is required.';
  }

  return errors;
}

export default function ReviewFormScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoadingWaiters, setIsLoadingWaiters] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waiterOptions, setWaiterOptions] = useState<WaiterNameIdOption[]>([]);
  const [waiterLoadError, setWaiterLoadError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [waiterPickerVisible, setWaiterPickerVisible] = useState(false);
  const [lovePickerVisible, setLovePickerVisible] = useState(false);

  const allDetailedRatingsSelected = useMemo(
    () => Object.values(form.ratings).every(Boolean),
    [form.ratings],
  );
  const shouldShowWhatWentWrong = useMemo(
    () =>
      allDetailedRatingsSelected &&
      Object.values(form.ratings).some((rating) => (rating ?? 0) <= 3),
    [allDetailedRatingsSelected, form.ratings],
  );
  const shouldShowWhatDidYouLove = useMemo(
    () =>
      allDetailedRatingsSelected &&
      Object.values(form.ratings).every((rating) => (rating ?? 0) >= 4),
    [allDetailedRatingsSelected, form.ratings],
  );

  const hasStartedEditing = useMemo(() => {
    return (
      Boolean(form.name.trim()) ||
      Boolean(form.email.trim()) ||
      Boolean(form.phone.trim()) ||
      Boolean(form.overallExperience) ||
      form.likedMost.length > 0 ||
      Object.values(form.ratings).some(Boolean) ||
      form.whatWentWrong.length > 0 ||
      Boolean(form.whatWentWrongDetails.trim()) ||
      form.whatDidYouLove.length > 0 ||
      Boolean(form.servedBy) ||
      Boolean(form.rateWaiter) ||
      Boolean(form.additionalComments.trim())
    );
  }, [form]);

  const validationErrors = useMemo(
    () => buildValidationErrors(form, waiterOptions, waiterLoadError),
    [form, waiterLoadError, waiterOptions],
  );
  const showValidationErrors = submitAttempted || hasStartedEditing;
  const isFormValid =
    Object.keys(validationErrors).length === 0 && waiterOptions.length > 0 && !waiterLoadError;
  const selectedWaiterName =
    waiterOptions.find((option) => option._id === form.servedBy)?.fullName ?? '';

  const handleLogoutToLogin = useCallback(async () => {
    await clearTokens();
    router.replace('/login');
  }, [router]);

  const loadWaiters = useCallback(async () => {
    try {
      setIsLoadingWaiters(true);
      const nextWaiters = await fetchWaiterNameIdList();
      setWaiterOptions(nextWaiters);
      setWaiterLoadError(null);
    } catch (error) {
      setWaiterLoadError(
        error instanceof Error ? error.message : 'Unable to load the waiter list right now.',
      );
      setWaiterOptions([]);
    } finally {
      setIsLoadingWaiters(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const role = await getLoggedInRole();

      if (!isMounted) {
        return;
      }

      if (role !== 40) {
        await clearTokens();

        if (!isMounted) {
          return;
        }

        Alert.alert('Access not allowed', '', [
          {
            text: 'Logout',
            onPress: () => {
              if (isMounted) {
                router.replace('/login');
              }
            },
          },
        ]);
        return;
      }

      setIsCheckingAccess(false);
      await loadWaiters();
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [loadWaiters, router]);

  useEffect(() => {
    if (!shouldShowWhatWentWrong && (form.whatWentWrong.length > 0 || form.whatWentWrongDetails)) {
      setForm((currentForm) => ({
        ...currentForm,
        whatWentWrong: [],
        whatWentWrongDetails: '',
      }));
    }
  }, [form.whatWentWrong.length, form.whatWentWrongDetails, shouldShowWhatWentWrong]);

  useEffect(() => {
    if (!shouldShowWhatDidYouLove && form.whatDidYouLove.length > 0) {
      setForm((currentForm) => ({
        ...currentForm,
        whatDidYouLove: [],
      }));
    }
  }, [form.whatDidYouLove.length, shouldShowWhatDidYouLove]);

  useEffect(() => {
    if (!form.whatWentWrong.includes('Other') && form.whatWentWrongDetails) {
      setForm((currentForm) => ({
        ...currentForm,
        whatWentWrongDetails: '',
      }));
    }
  }, [form.whatWentWrong, form.whatWentWrongDetails]);

  const getFieldError = useCallback(
    (field: keyof ValidationErrors) => {
      if (!showValidationErrors) {
        return undefined;
      }

      return validationErrors[field];
    },
    [showValidationErrors, validationErrors],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true);

    const nextValidationErrors = buildValidationErrors(form, waiterOptions, waiterLoadError);

    if (Object.keys(nextValidationErrors).length > 0 || waiterOptions.length === 0 || waiterLoadError) {
      return;
    }

    const payload: ReviewPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      overallExperience: form.overallExperience as RatingValue,
      likedMost: form.likedMost,
      ratings: {
        foodQuality: form.ratings.foodQuality as RatingValue,
        service: form.ratings.service as RatingValue,
        ambiance: form.ratings.ambiance as RatingValue,
        environment: form.ratings.environment as RatingValue,
      },
      waiterDetails: [
        {
          servedBy: form.servedBy,
          rateWaiter: form.rateWaiter as RatingValue,
        },
      ],
      whatWentWrong: shouldShowWhatWentWrong ? form.whatWentWrong : null,
      whatWentWrongDetails:
        shouldShowWhatWentWrong && form.whatWentWrong.includes('Other')
          ? form.whatWentWrongDetails.trim()
          : null,
      whatDidYouLove: shouldShowWhatDidYouLove && form.whatDidYouLove.length > 0 ? form.whatDidYouLove : null,
      additionalComments: form.additionalComments.trim() ? form.additionalComments.trim() : null,
    };

    try {
      setIsSubmitting(true);
      await submitReview(payload);
      setForm(INITIAL_FORM_STATE);
      setSubmitAttempted(false);
      setLovePickerVisible(false);
      setWaiterPickerVisible(false);
      Alert.alert(
        'Success',
        'Review submitted successfully! Thank you for your feedback.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }, 100);
            },
          },
        ],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit review.';
      Alert.alert('Submission failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    shouldShowWhatDidYouLove,
    shouldShowWhatWentWrong,
    waiterLoadError,
    waiterOptions,
  ]);

  if (isCheckingAccess) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top', 'left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.screenTitle}>Review Form</Text>
              <Text style={styles.screenSubtitle}>Share your Gogo&apos;s experience.</Text>
            </View>
            <Pressable onPress={handleLogoutToLogin} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, name: value }))}
                placeholder="Enter your name"
                style={styles.input}
              />
              {getFieldError('name') ? <Text style={styles.errorText}>{getFieldError('name')}</Text> : null}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, email: value }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              {getFieldError('email') ? <Text style={styles.errorText}>{getFieldError('email')}</Text> : null}
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                value={form.phone}
                onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, phone: value.replace(/[^\d]/g, '').slice(0, 11) }))}
                placeholder="03xxxxxxxxx"
                keyboardType="phone-pad"
                style={styles.input}
              />
              {getFieldError('phone') ? <Text style={styles.errorText}>{getFieldError('phone')}</Text> : null}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overall Experience</Text>
            <RatingSelector
              label="How was your Gogo&apos;s experience today?"
              value={form.overallExperience}
              onChange={(value) => setForm((currentForm) => ({ ...currentForm, overallExperience: value }))}
            />
            {getFieldError('overallExperience') ? (
              <Text style={styles.errorText}>{getFieldError('overallExperience')}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What did you like the most?</Text>
            <ChipGroup
              options={LIKED_MOST_OPTIONS}
              selectedValues={form.likedMost}
              onToggle={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  likedMost: toggleSelection(currentForm.likedMost, value),
                }))
              }
            />
            {getFieldError('likedMost') ? <Text style={styles.errorText}>{getFieldError('likedMost')}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Detailed Ratings</Text>
            <RatingSelector
              label="Food Quality"
              value={form.ratings.foodQuality}
              onChange={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  ratings: { ...currentForm.ratings, foodQuality: value },
                }))
              }
            />
            {getFieldError('foodQuality') ? <Text style={styles.errorText}>{getFieldError('foodQuality')}</Text> : null}

            <RatingSelector
              label="Service"
              value={form.ratings.service}
              onChange={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  ratings: { ...currentForm.ratings, service: value },
                }))
              }
            />
            {getFieldError('service') ? <Text style={styles.errorText}>{getFieldError('service')}</Text> : null}

            <RatingSelector
              label="Ambiance"
              value={form.ratings.ambiance}
              onChange={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  ratings: { ...currentForm.ratings, ambiance: value },
                }))
              }
            />
            {getFieldError('ambiance') ? <Text style={styles.errorText}>{getFieldError('ambiance')}</Text> : null}

            <RatingSelector
              label="Environment"
              value={form.ratings.environment}
              onChange={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  ratings: { ...currentForm.ratings, environment: value },
                }))
              }
            />
            {getFieldError('environment') ? <Text style={styles.errorText}>{getFieldError('environment')}</Text> : null}
          </View>

          {shouldShowWhatWentWrong ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>What went wrong?</Text>
              <ChipGroup
                options={WHAT_WENT_WRONG_OPTIONS}
                selectedValues={form.whatWentWrong}
                onToggle={(value) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    whatWentWrong: toggleSelection(currentForm.whatWentWrong, value),
                  }))
                }
              />
              {getFieldError('whatWentWrong') ? (
                <Text style={styles.errorText}>{getFieldError('whatWentWrong')}</Text>
              ) : null}

              {form.whatWentWrong.includes('Other') ? (
                <View style={[styles.fieldWrap, styles.conditionalField]}>
                  <Text style={styles.label}>Please specify:</Text>
                  <TextInput
                    value={form.whatWentWrongDetails}
                    onChangeText={(value) =>
                      setForm((currentForm) => ({ ...currentForm, whatWentWrongDetails: value }))
                    }
                    placeholder="Tell us what happened"
                    multiline
                    style={[styles.input, styles.multilineInput]}
                  />
                  {getFieldError('whatWentWrongDetails') ? (
                    <Text style={styles.errorText}>{getFieldError('whatWentWrongDetails')}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {shouldShowWhatDidYouLove ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>What did you love?</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setLovePickerVisible(true)}>
                <Text style={form.whatDidYouLove.length ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {form.whatDidYouLove.length ? form.whatDidYouLove.join(', ') : 'Select one or more options'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Waiter Selection</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Who served you today?</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setWaiterPickerVisible(true)}
                disabled={isLoadingWaiters || waiterOptions.length === 0}>
                <Text style={selectedWaiterName ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {isLoadingWaiters
                    ? 'Loading waiter list...'
                    : selectedWaiterName || 'Select a waiter'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </Pressable>
              {waiterLoadError ? (
                <View style={styles.waiterErrorRow}>
                  <Text style={styles.errorText}>{waiterLoadError}</Text>
                  <Pressable onPress={loadWaiters} style={styles.retryInlineButton}>
                    <Text style={styles.retryInlineText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
              {getFieldError('servedBy') && !waiterLoadError ? (
                <Text style={styles.errorText}>{getFieldError('servedBy')}</Text>
              ) : null}
            </View>

            <RatingSelector
              label="Rate your service experience"
              value={form.rateWaiter}
              onChange={(value) => setForm((currentForm) => ({ ...currentForm, rateWaiter: value }))}
            />
            {getFieldError('rateWaiter') ? <Text style={styles.errorText}>{getFieldError('rateWaiter')}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Additional Comments</Text>
            <TextInput
              value={form.additionalComments}
              onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, additionalComments: value }))}
              placeholder="Anything else you would like to share?"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.commentInput]}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                setForm(INITIAL_FORM_STATE);
                setSubmitAttempted(false);
              }}
              disabled={isSubmitting}
              style={[styles.clearButton, isSubmitting && styles.submitButtonDisabled]}>
              <Ionicons name="refresh-outline" size={18} color={BRAND_COLOR} />
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting || isLoadingWaiters}
              style={[
                styles.submitButton,
                (!isFormValid || isSubmitting || isLoadingWaiters) && styles.submitButtonDisabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        <SelectionModal
          visible={waiterPickerVisible}
          title="Select waiter"
          onClose={() => setWaiterPickerVisible(false)}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {waiterOptions.map((option) => {
              const isSelected = form.servedBy === option._id;

              return (
                <Pressable
                  key={option._id}
                  onPress={() => {
                    setForm((currentForm) => ({ ...currentForm, servedBy: option._id }));
                    setWaiterPickerVisible(false);
                  }}
                  style={[styles.listOption, isSelected ? styles.listOptionSelected : null]}>
                  <Text style={[styles.listOptionText, isSelected ? styles.listOptionTextSelected : null]}>
                    {option.fullName}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={BRAND_COLOR} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SelectionModal>

        <SelectionModal
          visible={lovePickerVisible}
          title="What did you love?"
          onClose={() => setLovePickerVisible(false)}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {WHAT_DID_YOU_LOVE_OPTIONS.map((option) => {
              const isSelected = form.whatDidYouLove.includes(option);

              return (
                <Pressable
                  key={option}
                  onPress={() =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      whatDidYouLove: toggleSelection(currentForm.whatDidYouLove, option),
                    }))
                  }
                  style={[styles.listOption, isSelected ? styles.listOptionSelected : null]}>
                  <Text style={[styles.listOptionText, isSelected ? styles.listOptionTextSelected : null]}>
                    {option}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={BRAND_COLOR} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SelectionModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#fce7f3',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  fieldWrap: {
    gap: 8,
  },
  conditionalField: {
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  commentInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  ratingBlock: {
    gap: 10,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starButton: {
    paddingVertical: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  chipText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  dropdownTrigger: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dropdownPlaceholder: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 15,
  },
  dropdownValue: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
  },
  waiterErrorRow: {
    gap: 10,
  },
  retryInlineButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  retryInlineText: {
    color: BRAND_COLOR,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: BRAND_COLOR,
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: BRAND_COLOR,
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    flex: 2,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    padding: 20,
    justifyContent: 'center',
  },
  modalCard: {
    maxHeight: '70%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listOption: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listOptionSelected: {
    backgroundColor: '#fdf2f8',
  },
  listOptionText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
  },
  listOptionTextSelected: {
    fontWeight: '600',
    color: BRAND_COLOR,
  },
});