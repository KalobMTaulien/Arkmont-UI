$(document).ready(function () {
  // Body selector.
  const body = $('body');
  // Course and lesson data, used mainly for ajax requests.
  const sender = {
    // This will be a slug, not an int.
    courseId: body.data('course-id'),
  };

  // In the event this is required (usually for S3 uploads), we can check and
  // request the courseId (the int, not the string)
  const courseIdReversed = body.attr('data-course-id-rev');

  const error = function (errSelector, message) {
    if (message !== undefined && message !== 'reset') {
      errSelector.html(message).addClass('account__error--visible');
    } else {
      errSelector.removeClass('account__error--visible');
    }

    return false;
  };

  //
  // Auto-loading actions
  //

  // Look for, and animate, any progress bars.
  $('.progress-bar[data-percent]').each(function() {
    $(this).css({
      width: $(this).data('percent') + '%',
    });
  });

  // Wrap the sorting into an anon function so we can call it whenever we need it.
  const dragAndDrop = function () {

    return $('.lesson--sortable').sortable({
      items: 'li.draggable',
      dropOnEmpty: false,
      cursor: 'move',
      revert: false,
      placeholder: 'draggable--placeholder',
      cancel: 'input',
      handle: '.js-drag-lesson',
      axis: 'y',
      opacity: 0.7,
      snap: true,
      stop: function (event) {
        // So we don't need to query the dom twice.
        const lessonNumbers = $('.lesson__number');

        sender.lessons = [];
        $('li.lesson[data-lesson-id]').each(function (i) {
          sender.lessons.push({
            lessonId: $(this).data('data-lesson-id'),
            moduleId: $(this).closest('ul.sman__module').attr('data-module-id'),
            weight: i,
          });
          $(this).find('.lesson__number').text((i + 1));
        });

        // Refresh the sortability.
        $(this).sortable('refresh');

        // Save the new lesson weights and modules
        ajax('set-course-syllabus-order', sender,
          function beforeReorder() {
            // Make the lesson number translucent and then change it.
            // Make the lesson number and text translucent as the "this is loading" sign, instead of a control button
            lessonNumbers.css('opacity', 0.3);
          },
          function reorderComplete(data) {

          },
          function reorderFailed() {

          },
          function reorderAlways() {
            lessonNumbers.css('opacity', 1);
          });
      },
      connectWith: '.lesson--sortable',
      create: function() {
        // Refresh the sorting everytime this is loaded.
        $(this).sortable('refresh').sortable('refreshPositions');
      }
    });
  };
  //
  // If there are sortable properties in the DOM, enable sorting.
  // This requires jQuery UI
  //
  if ($('.lesson--sortable').length) {
    // Init drag n drop
    dragAndDrop();
  }

  $(document)
  // When course 'section' buttons are clicked.
  .on('click', '.course__otherpages', function (e) {
    // The 540 below MUST match the media query breakpoint in that works toghether with .course__otherpages
    if ($(window).outerWidth(true) <= 540) {
      $(this).toggleClass('course__otherpages--opened');
      return e.preventDefault();
    }

    return true;
  })
  // Submit event: Change course details
  .on('submit', '.js-change-details', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.details = {
      name: $.trim($('[name="course_name"]', form).val()),
      brief: $.trim($('[name="course_brief"]', form).val()),
      url: $.trim($('[name="course_url"]', form).val()),
      category: $.trim($('[name="course_category"]', form).val()),
    };

    ajax('set-course-details', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Set the fields to whatever was returned by the database.
        for (let key in data) {
          $(':input[name="course_' + key + '"]', form).val(data[key]);
        }
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Submit event: Change course license
  .on('submit', '.js-change-license', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.license = $('[name="course_license"]', form).val();

    ajax('set-course-license', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Change the license field to what Arkmont recognizes it to be.
        $(':input[name="course_license"]', form).val(data.license);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Submit event: Change course price
  .on('submit', '.js-change-price', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.price = parseFloat($('[name="course_price"]', form).val()).toFixed(2);

    if (sender.price > 0) {
      if (sender.price < 9 || sender.price >= 1000) {
        return error(errorSelector, 'Course prices must be between $9 and $999.99');
      }
    } else {
      // The price is 0 or less than zero, the course will be made free.
      sender.price = 0.00;
    }

    ajax('set-course-price', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Change recognized price. Minimums and maximums may take place through server-side validation
        $(':input[name="course_price"]', form).val(data.price);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: Show the new coupon form.
  .on('click', '.js-create-coupon', function (e) {
    $(this).hide();
    $('.js-add-coupon').slideDown(300, function () {
      $('html, body').animate({
        scrollTop: $(this).offset().top - 70,
      }, 450, function() {
        $(':input[name="coupon_code"]').focus();
      });
    });
    return e.preventDefault();
  })
  // Submit event: Add a coupon
  .on('submit', '.js-add-coupon', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.coupon = {
      price: parseFloat($('[name="coupon_price"]', form).val()).toFixed(2),
      totalCoupons: Number($('[name="coupon_total"]', form).val()),
      code: String($('[name="coupon_code"]', form).val()).toUpperCase(),
    };

    // Minimum price validation
    if (sender.coupon.price < 5) {
      return error(errorSelector, 'Coupon price must be $5 or more.');
    }

    // totalCode vaidation
    if (sender.coupon.totalCoupons < 1 || sender.coupon.totalCoupons > 200) {
      return error(errorSelector, 'You can create between 1 and 200 coupons at a time');
    }

    ajax('set-course-coupon', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Table object
        const table = $('.js-coupon-table');
        // Change recognized price. Minimums and maximums may take place through server-side validation
        $(':input[name="course_price"]', form).val(data.price);
        $('tbody', table)
          .append('<tr>' +
                    '<td>' + data.code + '</td>' +
                    '<td>$' + data.price.toFixed(2) + '</td>' +
                    '<td>' + data.totalCoupons + '</td>' +
                    '<td class="js-coupon-active">Yes</td>' +
                    '<td class="text--right"><button class="btn btn--sm js-deactivate-coupon" ' +
                          'data-coupon-id="' + data.id + '" data-action="confirm">Deactivate</button></td>' +
                  '</tr>');
        table.show();
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: a coupon is beign deactivated
  // This event takes a different action based on the data-action attr.
  .on('click', '.js-deactivate-coupon', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "deactivate"
      btn.attr('data-action', 'deactivate');
    } else {
      // Deactivate this coupon.
      sender.couponId = btn.attr('data-coupon-id');

      ajax('set-course-coupon-deactivate', sender,
        function beforeDeactivation() {
          btn.button();
        },
        function deactivationComplete() {
          btn.closest('tr').find('.js-coupon-active').text('No');
          btn.button('reset');
          btn.prop('disabled', true).addClass('disabled').text('Inactive');
        },
        function deactivationFailed() {
          btn.button('reset');
        },
        function deactivationAlways() {

        });
    }
    return e.preventDefault();
  })
  // Click event: report a review
  .on('click', '.js-report-review', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "report"
      btn.attr('data-action', 'report');
    } else {
      // Deactivate this coupon.
      sender.reportType = btn.attr('data-report');
      sender.reviewId = Number(btn.attr('data-review-id'));

      ajax('set-course-report-review', sender,
        function beforeReport() {
          btn.button();
        },
        function reportComplete() {
          btn.button('reset');
          btn.closest('.review__actioncontainer').find('button').not(btn).remove();
          btn.text('Report Filed').addClass('disabled').prop('disabled', true);
        },
        function reportFailed() {
          btn.button('reset');
        },
        function reportAlways() {

        });
    }
    return e.preventDefault();
  })
  // Click even: Lesson with reviews is being opened.
  .on('click', '.js-lesson-review', function (e) {
    const t = $(this);
    const isOpened = t.attr('data-opened') === 'false' ? false : true;

    if (!isOpened) {
      // The data has not been ajaxed. Collect it now.
      const btn = $('span', t);
      sender.lessonId = t.attr('data-lesson-id');
      ajax('get-course-lesson-reviews', sender,
        function beforeLessonReview() {
          btn.button();
        },
        function lessonReviewsComplete (data) {
          t.attr('data-opened', 'true');
          let html = '';
          const uniqueId = sender.lessonId + '-';

          for (i in data.keywords) {
            html +='<div class="lr__item">' +
                    '<div class="lr__name">' +
                      data.keywords[i].term +
                      ' (' + data.keywords[i].total + ' reviews)' +
                    '</div>' +
                    '<div class="lr__bar">' +
                      '<div class="progress">' +
                        '<div class="progress-wrapper">' +
                          '<div class="progress-bar" id="' + uniqueId + i + '">' +
                            data.keywords[i].percent + '%' +
                          '</div>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                  '</div>';
          }

          t.after(html);

          // Animate each progress bar by changing their widths.
          setTimeout(function () {
            for (i in data.keywords) {
              $('#' + uniqueId + i).css({width: data.keywords[i].percent + '%'});
            }
          }, 200);
        },
        function lessonReviewsFailed() {
        },
        function lessonReviewsAlways() {
          btn.button('reset');
        });
      btn.button();

    }
    return e.preventDefault();
  })
  // Submit event: Edit google analytics tracking id
  .on('submit', '.js-change-google-analytics', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.trackingId = $('[name="course_ga"]', form).val();

    ajax('set-course-google-analytics', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Set the form to whatever the servers return.
        $('[name="course_ga"]', form).val(data.trackingId);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: a teacher is being removed
  // This event takes a different action based on the data-action attr.
  .on('click', '.js-remove-teacher', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "remove"
      btn.attr('data-action', 'remove');
    } else {
      // Remove this teacher
      sender.teacherId = btn.attr('data-teacher-id');

      ajax('set-course-remove-teacher', sender,
        function beforeAjaxRequest() {
          btn.button();
        },
        function ajaxRequestComplete() {
          btn.closest('tr').remove();
        },
        function ajaxRequestFailed() {
          btn.button('reset');
        },
        function ajaxRequestAlways() {

        });
    }
    return e.preventDefault();
  })
  // Click event: Show the new coupon form.
  .on('click', '.js-show-teacher-form', function (e) {
    $(this).hide();
    $('.js-add-teacher').slideDown(300, function () {
      $('html, body').animate({
        scrollTop: $(this).offset().top - 70,
      }, 450, function () {
        $(':input[name="teacher_email"]').focus();
      });
    });
    return e.preventDefault();
  })
  // Submit event: Add a coupon
  .on('submit', '.js-add-teacher', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.teacher = {
      email: $('[name="teacher_email"]', form).val().toLowerCase(),
      earningPercent: Number($('[name="teacher_amount"]', form).val()),
    };

    // Minimum price validation
    if (sender.teacher.earningPercent > 90) {
      return error(errorSelector, 'Please enter a valid earning percent for this teacher.');
    }

    ajax('set-course-add-teacher', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Clear the teacher form.
        $(':input', form).val('');
        // Table object
        const table = $('.js-teacher-table');
        // Add the new row to the table.
        $('tbody', table)
          .append('<tr>' +
                    '<td>' + data.name + '</td>' +
                    '<td>' + data.earningPercent + '%</td>' +
                    '<td class="text--right">' +
                      '<button class="btn btn--sm js-remove-teacher" ' +
                              'data-teacher-id="' + data.teacherId + '" data-action="confirm">' +
                                'Remove' +
                      '</button>' +
                    '</td>' +
                  '</tr>');
        table.show();
        $('html, body').animate({
          scrollTop: table.offset().top - 70,
        }, 450);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: a teacher assistant is being removed
  // This event takes a different action based on the data-action attr.
  .on('click', '.js-remove-teacher-assistant', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "remove"
      btn.attr('data-action', 'remove');
    } else {
      // Remove the TA
      sender.teacherAssistantId = btn.attr('data-teacher-assistant-id');

      ajax('set-course-remove-teacher-assistant', sender,
        function beforeAjaxRequest() {
          btn.button();
        },
        function ajaxRequestComplete() {
          btn.closest('tr').remove();
        },
        function ajaxRequestFailed() {
          btn.button('reset');
        },
        function ajaxRequestAlways() {

        });
    }
    return e.preventDefault();
  })
  // Submit event: Add a coupon
  .on('submit', '.js-add-teacher-assistant', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.teacherAssitantEmail = $('[name="ta_email"]', form).val().toLowerCase();

    ajax('set-course-add-teacher-assistant', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Clear the teacher form.
        $(':input', form).val('');
        // Table object
        const table = $('.js-teacher-table');
        // Add the new row to the table.
        $('tbody', table)
          .append('<tr>' +
                    '<td>' + data.name + '</td>' +
                    '<td class="text--right">' +
                      '<button class="btn btn--sm js-remove-teacher-assistant" ' +
                              'data-teacher-assistant-id="' + data.studentId + '" data-action="confirm">' +
                                'Remove' +
                      '</button>' +
                    '</td>' +
                  '</tr>');
        table.show();
        $('html, body').animate({
          scrollTop: table.offset().top - 70,
        }, 450);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: A teacher wants to know more about a student
  .on('click', '.js-student-details', function (e) {
    // The row
    const t = $(this);
    // Has been opened or not.
    const isOpened = t.attr('data-opened') === 'false' ? false : true;

    // If this row was not opened yet, request data.
    if (!isOpened) {
      sender.studentId = t.data('student-id');
      // State this row was opened. Revert back if ajax fails.
      t.attr('data-opened', 'true');

      ajax('get-course-student-details', sender,
        function beforeSend() {

        },
        function requestComplete(data) {
          t.after('<tr class="no-hover">' +
                    '<td colspan="3">' +
                      '<div class="student__details">' +
                        '<label>Name:</label> ' + data.name +
                      '</div>' +
                      '<div class="student__details">' +
                        '<label>Email:</label> ' + data.email +
                      '</div>' +
                      '<div class="student__details">' +
                        '<label>Questions Asked:</label> ' + data.totalQuestionsAsked +
                      '</div>' +
                      '<div class="student__details">' +
                        '<label>Comments Added:</label> ' + data.totalCommentsProvided +
                      '</div>' +
                    '</td>' +
                  '</tr>');
        },
        function requestFailed() {
          // Ajax request failed, let the user send another request.
          t.attr('data-opened', 'false');
        },
        function requestAlways() {

        });
    }
    return e.preventDefault();
  })
  // Submit event: A new announcement was written and is being submitted
  .on('submit', '.js-create-announcement', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button[type="submit"]', form);
    const errorSelector = $('.js-error', form);

    sender.announcement = {
      title: $.trim($('[name="announcement_title"]', form).val()),
      body: $.trim($('.announcement-body').trumbowyg('html')),
    };

    if (!sender.announcement.title.length) {
      return error(errorSelector, 'Your announcement needs a title.');
    } else if (!sender.announcement.body.length) {
      return error(errorSelector, 'Your announcement needs some content.');
    }

    ajax('set-course-announcement', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Move the teacher to their new announcement.
        window.location = data.announcement.url;
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Change event: An intro video file is being selected.
  .on('change', '.js-select-intro-video', function (e) {
    const filenameSpan = $('.selected-file-name');
    const uploadInput = $('.js-select-intro-video')[0];
    const file = uploadInput.files[0];
    const uploadProgress = $('.js-upload-percent');
    const progressBar = $('.progress-bar');

    // It is assumed that /js/aws-sdk-2.3.5.min.js is loaded when updating AWS keys.
    // We "assume" this, even thought that's a bad practice, so the user doesn't need to load the AWS JS lib on
    // every Manager page.
    AWS.config.update({
      accessKeyId: 'SAMPLE-KEY-HERE',
      secretAccessKey: 'SAMPLE-ACCESS-KEY-HERE',
      region: 'us-west-1',
    });
    const bucket = new AWS.S3({
      params: {
        Bucket: 'arkmont',
      },
    });

    // If there is no file, cancel the upload.
    if (!file) {
      filenameSpan.text('');
      return false;
    }

    if (file.type !== 'video/mp4' && file.type !== 'video/avi'
        && file.type !== 'video/quicktime' && file.type !== 'video/x-ms-wmv') {
      filenameSpan.text('');
      return false;
    }

    // JS file validation completed. Display the filename.
    filenameSpan.text(file.name);

    // Set the upload file name; replace non alphanumeric's with dashes
    const newFilename = file.name.replace(/[^a-zA-Z0-9-_.]/g, '-');

    // Set the upload params.
    const params = {
      Key: 'courses/' + courseIdReversed + '/intro/' + newFilename,
      ContentType: file.type,
      Body: file,
      ACL: 'private',
      CacheControl: 'max-age=86400',
    };

    // Reset progress bar
    progressBar.css('width', '20%');
    uploadProgress.html('Starting upload...');

    // Commence upload!
    const upload = bucket.upload(params, function (err, data) {
      if (!err) {

        sender.fileLocation = data.Location;
        sender.filename = newFilename;

        ajax('set-course-intro-video', sender,
          function beforeSaveIntroVideo() {
            uploadProgress.html('Starting upload...');
          },
          function saveIntroVideoComplete(data) {
            uploadProgress.html('Upload complete <i class="fa fa-check"></i>');
            // Reload the page to display the users new video in the player.
            setTimeout(function () {
              location.reload();
            }, 3000);
          },
          function saveIntroVideoFailed() {
            // Reset the form.
            $('.js-video-upload-form')[0].reset();
          },
          function saveIntroVideoAlways() {
            uploadProgress.html('');
            progressBar.css('width', 0);
          });
      } else {
        progressBar.css('width', 0);
        uploadProgress.html('Upload failed <i class="fa fa-times"></i>');
        // Reset the form.
        $('.js-video-upload-form')[0].reset();
      }
    });

    upload.on('httpUploadProgress', function (progress) {
      const percent = Math.floor(progress.loaded / (progress.total * 100));
      uploadProgress.html(percent + '%');
      // We leave a little room for the upload text inside the progress bar.
      if (percent > 20) {
        progressBar.css('width', percent + '%');
      }
    });
  })
  // Change event: A cover image file is being selected.
  // This event assumes that jquery.form.min.js is installed.
  .on("change", ".js-select-cover-image", function(e) {
    e.preventDefault();

    const form = $(this).closest('form');
    const uploadInput = $('.js-select-cover-image')[0];
    const file = uploadInput.files[0];

    // If there is a file, submit the form.
    if (file) {
      form.submit();
    }
  })
  // Submit event: A cover image was selected, now upload the file automatically.
  // This event assumes that jquery.form.min.js is installed.
  .on('submit', '.js-image-upload-form', function(e) {
    e.preventDefault();

    const form = $(this);   // Form
    const filenameSpan = $('.selected-file-name');
    const uploadInput = $('.js-select-cover-image')[0];
    const file = uploadInput.files[0];
    const uploadProgress = $('.js-upload-percent');
    const progressBar = $('.progress-bar');
    // Set the upload file name; replace non alphanumeric's with dashes
    const newFilename = file.name.replace(/[^a-zA-Z0-9-_.]/g, '-');
    const errorSelector = $('.js-error', form);

    if (newFilename === '') {
      // Do nothing because the file was changed to `empty`
      filenameSpan.text('');
      form.clearForm();
      return error(errorSelector, 'reset');
    } else if (file.type !== 'image/png' && file.type !== 'image/jpg' && file.type !== 'image/jpeg') {
      // Do nothing, we need an acceptable image (png or jpg)
      filenameSpan.text('');
      return error(errorSelector, 'Please select a .png or .jpg image.');
    }

    // Reset any errors.
    error(errorSelector, 'reset');

    $(this).ajaxSubmit({
      data: sender,
      type: 'POST',
      url: '/ajax/set-course-cover-image.json',
      dataType: 'json',
      beforeSend: function () {
        // Do something just before the submit is finalized.
        uploadProgress.html('Starting upload...');
      },
      uploadProgress: function (event, position, total, percent) {
        uploadProgress.html(percent + '%');
        // We leave a little room for the upload text inside the progress bar.
        if (percent > 20) {
          progressBar.css('width', percent + '%');
        } else if (percent >= 99) {
          progressBar.css('width', '100%');
          uploadProgress.html('Compressing image...');
        }
      },
      complete: function () {
        // Clear the form
        form.clearForm();
      },
      success: function (data) {
        // Change the image sources found on the page.
        $('.header__bg--0').css('background-image', 'url(' + data.cover.small + ')');
        $('.js-current-image').attr('src', data.cover.large);
      },
      error: function (e) {
        uploadProgress.html('');
        progressBar.css('width', 0);
      },
    });
    return false;
  })
  // Submit event: A new course description is being added.
  .on('submit', '.js-update-description', function (e) {
    e.preventDefault();
    const form = $(this);
    const btn = $('button[type="submit"]', form);
    const errorSelector = $('.js-error', form);
    const tmp = $('.tmp:first', form);

    sender.description = $.trim($('.description-body').trumbowyg('html'));

    // Check the total number of words in a description. There should be at least 200 words to describe this course.
    tmp.html(sender.description);

    // Clone whats in the DOM
    const clone = tmp.clone();

    // Remove pretty much all attributes, they aren't needed.
    $('*', clone).removeAttr('class id style name onerror onclick ondblclick onmousedown onmouseover onmouseup onmousewheel oncopy oncut onpaste title disabled alt onload onkeyup onkeypress onkeydown');

    // Re-apply the new html
    tmp.html(clone);

    // Get the new html now. It'll be wrapped in a parent <div>, filter that out with a selector.
    const description = $.trim($('.tmp > div')[0].innerHTML);

    // const words = $.trim($('.tmp', form).text()).split(' '); //.length;
    const words = $('.tmp', form).text().split(' ').length;

    if (words < 200) {
      return error(errorSelector, 'Every course must have at least 200 words to describe it.');
    }

    // Re-write the sender.description with the new description from .tmp
    sender.description = description;

    ajax('set-course-description', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to 'loading' state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        $('.description-body').trumbowyg('html', data.description);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: A keyword label is being removed.
  .on('click', '.js-remove-keyword', function (e) {
    $(this).remove();
    // Check how many keywords exist in the DOM. If there are 10 or less, enable the .js-add-keyword button
    if ($('.manager__keywordcontainer').find('.js-remove-keyword').length < 10) {
      $('.js-add-keyword').removeClass('disabled').prop('disabled', false);
    }
    return e.preventDefault();
  })
  // Click event: A new keyword is being added.
  .on('click', '.js-add-keyword', function (e) {
    e.preventDefault();
    if (!$('.js-new-keyword').length) {
      $(this).before(' <input type="text" placeholder="Add New Point" class="keyword keyword--add js-new-keyword" /> ');
    }
    // Always focus on the input field.
    $('.js-new-keyword').focus();
    return false;
  })
  // Click event: A new keyword is being saved.
  .on('keydown', '.js-new-keyword', function (e) {

    if (e.keyCode === 188 || e.keyCode === 13) {
      const val = $.trim(this.value.replace(/[^a-zA-Z0-9\s-_]/g, ' '));
      if (val.length > 0) {
        // Note: Spacing is required because of the inline-block nature.
        $(this).before(' <span class="keyword keyword--removable js-remove-keyword" data-keyword="' + val + '">' +
                          val +
                        '</span> ');
        // Clear this value
        this.value = '';
        // Refocus on the input area.
        this.focus();

        // Check how many keywords exist in the DOM. If there are 10 or more, remove the input field
        // and disable the .js-add-keyword.
        if ($('.manager__keywordcontainer').find('.js-remove-keyword').length >= 10) {
          this.remove();
          $('.js-add-keyword').addClass('disabled').prop('disabled', true);
        }
      }
      return e.preventDefault();
    }
  })
  // Submit event: Keywords are being saved.
  .on('submit', '.js-update-keywords', function (e) {
    e.preventDefault();
    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.keywords = [];

    // Add keywords
    $('.manager__keywordcontainer').find('.js-remove-keyword').each(function () {
      const keyword = $(this).attr('data-keyword');
      if ($.inArray(keyword, sender.keywords)) {
        sender.keywords.push(keyword);
      }
    })

    // If there are no unique keywords, don't submit the form and send an error message.
    if (!sender.keywords.length) {
      return error(errorSelector, 'Please enter at least one value.s');
    }

    ajax('set-course-keywords', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');

        // Remove all the existing keyword, and replace them with what the database has stored for syncd user-service data.
        $('.js-remove-keyword').remove();

        const keywordContainer = $('.manager__keywordcontainer');
        for (let i in data.keywords) {
          keywordContainer
            .prepend(' <span class="keyword keyword--removable js-remove-keyword" data-keyword="' + data.keywords[i] + '">' +
                        data.keywords[i] +
                      '</span> ');
        }

        // Check if the new keyword input needs to be removed, and the add keyword btn needs to be disabled.
        if (data.keywords.length >= 10) {
          $('.js-new-keyword').remove();
          $('.js-add-keyword').addClass('disabled').prop('disabled', true);
        }
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Submit event: Course requirements are being added
  // The wording "keyword" is used because it's part of the SCSS module "keywords",
  // and the "keywords" jQuery listeners, but modified to work for "requirements"
  .on('submit', '.js-update-requirements', function (e) {
    e.preventDefault();
    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.requirements = [];

    // Add requirements
    $('.manager__keywordcontainer').find('.js-remove-keyword').each(function () {
      const keyword = $(this).attr('data-keyword');
      if ($.inArray(keyword, sender.requirements)) {
        sender.requirements.push(keyword);
      }
    })

    // If there are no unique requirements, don't submit the form and send an error message.
    if (!sender.requirements.length) {
      return error(errorSelector, 'Please enter at least one value.');
    }

    ajax('set-course-requirements', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');

        // Remove all the existing keyword, and replace them with what the database has stored for syncd user-service data.
        $('.js-remove-keyword').remove();

        const keywordContainer = $('.manager__keywordcontainer');
        for (let i in data.requirements) {
          keywordContainer
            .prepend(' <span class="keyword keyword--removable js-remove-keyword" data-keyword="' + data.requirements[i] + '">' +
                        data.requirements[i] +
                      '</span> ');
        }

        // Check if the new keyword input needs to be removed, and the add keyword btn needs to be disabled.
        if (data.requirements.length >= 10) {
          $('.js-new-keyword').remove();
          $('.js-add-keyword').addClass('disabled').prop('disabled', true);
        }
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Submit event: Course "acquired skills" are being added
  // The wording "keyword" is used because it's part of the SCSS module "keywords",
  // and the "keywords" jQuery listeners, but modified to work for "requirements"
  .on('submit', '.js-update-skills', function (e) {
    e.preventDefault();
    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.skills = [];

    // Add skills
    $('.manager__keywordcontainer').find('.js-remove-keyword').each(function () {
      const keyword = $(this).attr('data-keyword');
      if ($.inArray(keyword, sender.skills)) {
        sender.skills.push(keyword);
      }
    })

    // If there are no unique skills, don't submit the form and send an error message.
    if (!sender.skills.length) {
      return error(errorSelector, 'Please enter at least one value.');
    }

    ajax('set-course-skills', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');

        // Remove all the existing keyword, and replace them with what the database has stored for syncd user-service data.
        $('.js-remove-keyword').remove();

        const keywordContainer = $('.manager__keywordcontainer');
        for (let i in data.skills) {
          keywordContainer
            .prepend(' <span class="keyword keyword--removable js-remove-keyword" data-keyword="' + data.skills[i] + '">' +
                        data.skills[i] +
                      '</span> ');
        }

        // Check if the new keyword input needs to be removed, and the add keyword btn needs to be disabled.
        if (data.skills.length >= 10) {
          $('.js-new-keyword').remove();
          $('.js-add-keyword').addClass('disabled').prop('disabled', true);
        }
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: Teacher wants to remove a course.
  .on('click', '.js-delete-course', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "remove"
      btn.attr('data-action', 'remove');
    } else {
      // remove this course

      ajax('set-course-remove', sender,
        function beforeRemoval() {
          btn.button();
        },
        function removalComplete() {
          window.location = '/';
        },
        function removalFailed() {
          btn.button('reset');
        },
        function removalAlways() {

        });
    }
  })
  // Click event: Teacher wants to unpublish and delist their course
  .on('click', '.js-hide-course', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "delist"
      btn.attr('data-action', 'delist');
    } else {
      // delist and hide this course
      ajax('set-course-hide', sender,
        function beforeRemoval() {
          btn.button();
        },
        function removalComplete() {
          location.reload();
        },
        function removalFailed() {
          btn.button('reset');
        },
        function removalAlways() {

        });
    }
  })
  // Submit event: Lesson details (title and description) are being updated
  .on('submit', '.js-save-lesson-text', function (e) {
    e.preventDefault();

    const form = $(this);
    const btn = $('button', form);
    const errorSelector = $('.js-error', form);

    sender.title = $.trim($('[name="lesson_title"]', form).val());
    sender.description = $.trim($('[name="lesson_description"]', form).val());
    sender.lessonId = $(this).closest('.lesson').attr('data-lesson-id');

    ajax('set-course-lesson-text', sender,
      function beforeAjaxRequest() {
        // Remove any errors.
        error(errorSelector, 'reset');
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Set the fields to whatever was returned by the database.
        for (let key in data) {
          $(':input[name="lesson_' + key + '"]', form).val(data[key]);
        }
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {

      });
    return false;
  })
  // Click event: Teacher is clicking "Upload new video" button
  .on('click', '.js-upload-video', function (e) {
    const lesson = $(this).closest('.lesson');
    lesson.find('.js-video-selector').trigger('click');
    return e.preventDefault();
  })
  // Change event: "Upload new video" has a new video in it's field, start auto-upload.
  // Change event: "Upload supplemental file" has a new file in its field, start auto-upload.
  .on('change', '.js-video-selector, .js-file-selector', function (e) {
    $(this).closest('form').trigger('submit');
    return e.preventDefault();
  })
  // Submit event: "Upload new video" buttons has a new video and the form was triggered.
  .on('submit', '.js-upload-video-form', function (e) {
    e.preventDefault();
    const lesson = $(this).closest('.lesson');
    const lessonId = lesson.attr('data-lesson-id');
    const filenameSpan = $('.js-video-name', lesson);
    const uploadInput = $('.js-video-selector', lesson)[0];
    const file = uploadInput.files[0];
    const uploadProgress = $('.js-video-upload-progress', lesson);
    const btn = $('.js-upload-video', lesson);
    const errorSelector = $('.js-video-error', lesson);
    // It is assumed that /js/aws-sdk-2.3.5.min.js is loaded when updating AWS keys.
    // We "assume" this, even thought that's a bad practice, so the user doesn't need to load the AWS JS lib on
    // every Manager page.
    AWS.config.update({
      accessKeyId: 'SAMPLE-KEY-HERE',
      secretAccessKey: 'SAMPLE-ACCESS-KEY-HERE',
      region: 'us-west-1',
    });
    const bucket = new AWS.S3({
      params: {
        Bucket: 'arkmont',
      },
    });

    // If there is no file, cancel the upload.
    if (!file) {
      filenameSpan.text('');
      return error(errorSelector, 'reset');
    } else if (file.type !== 'video/mp4' && file.type !== 'video/avi'
        && file.type !== 'video/quicktime' && file.type !== 'video/x-ms-wmv') {
      filenameSpan.text('');
      return error(errorSelector, 'Please select an .avi, .mp4, .wmv or .mov video file.');
    } else if ( file.size > 500000000) {
      // 500mb limit
      // Make sure this file isn't absolutely massive
      filenameSpan.text('');
      return error(errorSelector, 'Your video is too large. It should be less than 500mb and less than 30 minutes.');
    }

    // JS file validation completed. Display the filename.
    filenameSpan.text(file.name);

    // Set the upload file name; replace non alphanumeric's with dashes
    const newFilename = file.name.replace(/[^a-zA-Z0-9-_.]/g, '-');
    const lessonIdReversed = lessonId.split('').reverse().join('');

    // Set the upload params.
    const params = {
      Key: 'courses/' + courseIdReversed + '/lessons/' + lessonIdReversed + '/' + newFilename,
      ContentType: file.type,
      Body: file,
      ACL: 'private',
      CacheControl: 'max-age=86400',
    };
    // Reset upload progress text
    uploadProgress.text('');
    // Reset any errors
    error(errorSelector, 'reset');
    // Button is loading.
    btn.button();

    // Commence upload!
    const upload = bucket.upload(params, function (err, data) {
      if (!err) {

        sender.fileLocation = data.Location;
        sender.filename = newFilename;
        sender.lessonId = lessonId;

        ajax('set-course-lesson-video', sender,
          function beforeVideoSave() {
            uploadProgress.text('Saving...');
          },
          function videoSaveComplete (data) {
            uploadProgress.html('Upload complete <i class="fa fa-check"></i>');
            setTimeout(function() {
              uploadProgress.html('');
              filenameSpan.text('');
            }, 8000);
          },
          function videoSaveFailed() {
            // Reset the form.
            $('.js-upload-video-form')[0].reset();
            uploadProgress.html('');
            filenameSpan.text('');
            $('.js-video-file-name', lesson).text(sender.filename);
            $('.js-video-length', lesson).text('Calculating...');
            error(errorSelector, 'There was a problem saving your video.');
          },
          function videoSaveAlways() {
            btn.button('reset');
          });
      } else {
        uploadProgress.text('');
        // Reset the form.
        $('.js-upload-video-form')[0].reset();
        // Reset the filename span
        filenameSpan.text('');
        btn.button('reset');
        error(errorSelector, 'There was a problem uploading your video.');
      }
    });

    upload.on('httpUploadProgress', function (progress) {
      const percent = Math.floor(progress.loaded / (progress.total * 100));
      uploadProgress.text(percent + '%');
    });

    return false;
  })
  // Click event: "Upload supplemental file" button is being clicked.
  .on('click', '.js-upload-file', function (e) {
    const lesson = $(this).closest('.lesson');
    lesson.find('.js-file-selector').trigger('click');
    return e.preventDefault();
  })
  // Submit event: "Upload supplemental file" has a file in its field and the form
  // was automatically triggered.
  .on('submit', '.js-upload-extra-form', function (e) {
    e.preventDefault();
    const lesson = $(this).closest('.lesson');
    const lessonId = lesson.attr('data-lesson-id');
    const uploadInput = $('.js-file-selector', lesson)[0];
    const file = uploadInput.files[0];
    const btn = $('.js-upload-file', lesson);
    const errorSelector = $('.js-video-error', lesson);
    // It is assumed that /js/aws-sdk-2.3.5.min.js is loaded when updating AWS keys.
    // We "assume" this, even thought that's a bad practice, so the user doesn't need to load the AWS JS lib on
    // every Manager page.
    AWS.config.update({
      accessKeyId: 'SAMPLE-KEY-HERE',
      secretAccessKey: 'SAMPLE-ACCESS-KEY-HERE',
      region: 'us-west-1',
    });
    const bucket = new AWS.S3({
      params: {
        Bucket: 'arkmont',
      },
    });
    // If there is no file, cancel the upload.
    if (!file) {
      return error(errorSelector, 'reset');
    } else if (file.size > 157286400) {
      // 500mb limit
      // Make sure this file isn't absolutely massive
      return error(errorSelector, 'Your file is too large. It should be less than 150mb.');
    }

    // Set the upload file name; replace non alphanumeric's with dashes
    const newFilename = file.name.replace(/[^a-zA-Z0-9-_.]/g, '-');
    const lessonIdReversed = lessonId.split('').reverse().join('');

    // Set the upload params.
    const params = {
      Key: 'courses/' + courseIdReversed + '/lessons/' + lessonIdReversed + '/files/' + newFilename,
      ContentType: file.type,
      Body: file,
      ACL: 'public-read',
    };
    // Reset any errors
    error(errorSelector, 'reset');
    // Button is loading.
    btn.button();

    // Commence upload!
    const upload = bucket.upload(params, function (err, data) {
      if (!err) {

        sender.location = data.Location;
        sender.filename = newFilename;
        sender.lessonId = lessonId;

        ajax('set-course-lesson-file', sender,
          function beforeVideoSave() {
          },
          function videoSaveComplete (data) {
            btn.button('saved');
            $('.lessonfiles', lesson)
              .append('<li>' +
                        '<a href="#" class="lessonfile" data-file-id="' + data.id + '">' +
                          ' <i class="fa fa-file-o"></i> ' +
                          data.filename +
                        '</a>' +
                      '</li>');
          },
          function videoSaveFailed() {
            // Reset the form.
            $('.js-upload-extra-form')[0].reset();
            error(errorSelector, 'There was a problem saving your file.');
            btn.button('reset');
          },
          function videoSaveAlways() {
          });
      } else {
        // Reset the form.
        $('.js-upload-extra-form')[0].reset();
        // Reset the filename span
        btn.button('reset');
        error(errorSelector, 'There was a problem uploading your file.');
      }
    });

    upload.on('httpUploadProgress', function (progress) {
      // const percent = Math.floor(progress.loaded / (progress.total * 100));
    });

    return false;
  })
  // Click event: A lesson is being removed.
  .on('click', '.js-delete-lesson', function (e) {
    const btn = $(this);
    const action = btn.attr('data-action');
    const lesson = btn.closest('.lesson');
    if (action === 'confirm') {
      btn.text('Are you sure?');
      // Change the action to "remove"
      btn.attr('data-action', 'remove');
    } else {
      // remove this lesson.
      sender.lessonId = lesson.attr('data-lesson-id');

      ajax('set-course-lesson-remove', sender,
        function beforeRemoval() {
          btn.button();
        },
        function lessonRemoved() {
          $('.lesson__content', lesson).slideUp(function () {
            lesson.fadeOut(function() {
              $(this).remove();
            })
          });
        },
        function lessonRemovalFailed() {
          btn.button('reset');
        },
        function lessonRemovalAlways() {

        });
    }
    return e.preventDefault();
  })
  // Change event: A lesson is being unpublished
  .on('change', '.js-publish-lesson', function (e) {
    const lesson = $(this).closest('.lesson');
    const check = $(this);

    sender.lessonId = lesson.attr('data-lesson-id');
    sender.published = (this.checked ? '1' : '0');

    ajax('set-course-lesson-published', sender,
      function beforePublishChange() {
      },
      function publishChangeComplete(data) {
        const publishedText = $('.lesson__published', lesson);
        check.prop('checked', data.published);
        if (data.published) {
          // Lesson was published
          publishedText.text('(Published)');
          lesson.removeClass('lesson--unpublished');
        } else {
          // Lesson was unpublished
          publishedText.text('(Unpublished)');
          lesson.addClass('lesson--unpublished');
        }
      },
      function publishChangeFailed() {
      },
      function publishChangedAlways() {
      });

    return e.preventDefault();
  })
  // Change event: A lesson is being set as a free preview
  .on('change', '.js-free-preview', function (e) {
    const lesson = $(this).closest('.lesson');
    const check = $(this);

    sender.lessonId = lesson.attr('data-lesson-id');
    sender.preview = (this.checked ? '1' : '0');

    ajax('set-course-lesson-preview', sender,
      function beforePublishChange() {
      },
      function publishChangeComplete(data) {
        check.prop('checked', data.preview);
      },
      function publishChangeFailed() {
      },
      function publishChangedAlways() {
      });

    return e.preventDefault();
  })
  // Click event: A lesson file is being clicked, give the teacher the option to delete it.
  .on('click', '.lessonfile', function (e) {
    const t = $(this);
    const li = t.closest('li');
    sender.fileId = t.attr('data-file-id');
    const fileName = $.trim(t.text());
    const modal = new Modal({
      title: fileName,
      size: 'small',
      message: 'Would you like to delete this file?',
      buttons: {
        cancel: {
          label: 'Cancel',
        },
        delete: {
          label: 'Delete File',
          className: 'js-delete-file',
          callback: function() {
            const btn = $('.js-delete-file');

            ajax('set-course-lesson-file-delete', sender,
              function beforeDelete() {
                btn.button();
              },
              function deleteComplete() {
                modal.closeModal();
                li.slideUp(function () {
                  li.remove();
                })
              },
              function deleteFailed() {
                btn.button('reset');
              },
              function deleteAlways() {

              });
            return false;
          }
        },
      } ,
    });
    return e.preventDefault();
  })
  // Click even: A new in-video question is being added.
  .on('click', '.js-add-question', function (e) {
    const t = $(this);
    const lesson = t.closest('.lesson');
    let multipleChoiceHtml = '';
    for (let i = 1; i <= 4; i++) {
      multipleChoiceHtml += '<tr class="no-hover question-option">' +
                                '<td class="text--center"><input type="checkbox" class="question-option-checkbox" /></td>' +
                                '<td>' +
                                  '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                    'placeholder="Add an answer here. Leave blank for no answer."></textarea>' +
                                '</td>' +
                              '</tr>';
    }
    const modal = new Modal({
      title: 'Add In-Lesson Question',
      message: '<p>In-lesson Questions will stop a video and ask the student a question. ' +
                  'They are multiple choice with one or more correct answers.</p>' +
                  '<label class="label label--full">Time in video (minutes)</label>' +
                  '<input type="number" placeholder="1" class="account__input" id="minute" min="0" max="60" />' +
                  '<label class="label label--full">Time in video (seconds)</label>' +
                  '<input type="number" placeholder="15" class="account__input" id="second" min="0" max="59" />' +
                  '<label class="label label--full">Question</label>' +
                  '<textarea class="account__input" id="question-box" maxlength="2000" rows="2" placeholder="Which is the..."></textarea>' +
                  '<table class="table table--nopadding" cellpadding="0" cellspacing="0">' +
                    '<thead>' +
                      '<tr>' +
                        '<th width="20%" class="text--center">Is Correct</th>' +
                        '<th>Answer Text</th>' +
                      '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                      multipleChoiceHtml +
                    '</tbody>' +
                  '</table>' +
                  '<p class="account__error js-error" id="question-error"></p>',
      buttons: {
        cancel: {
          label: 'Cancel',
        },
        save: {
          label: 'Add Question',
          className: 'js-add-invideo-question',
          callback: function () {
            const btn = $('.js-add-invideo-question');
            // A few rare circumstances where we use ID's instead of .js-* classNames
            let minute = Number($('#minute').val());
            let second = Number($('#second').val());
            const errorSelector = $('#question-error');
            // Every question must have at least one correct answer at all times.
            let hasOneCorrectAnswer = false;

            if (isNaN(minute)) {
              minute = 0;
            } else if (minute > 60) {
              minute = 60;
            } else if (minute < 0) {
              minute = 0;
            }

            if (isNaN(second)) {
              second = 0;
            } else if (second > 59) {
              second = 59;
            } else if (second < 0) {
              second = 0;
            }

            sender.time = (minute * 60) + second;
            sender.question = $.trim($('#question-box').val());
            sender.lessonId = lesson.attr('data-lesson-id');
            sender.answers = [];

            // Get all answers.
            $('.question-option').each(function () {
              const answer = $.trim($('.question-option-answer', this).val());
              if (answer !== null && answer.length > 0) {
                const arr = {
                  answer: answer.substr(0, 500),
                  correct: $('.question-option-checkbox', this).is(':checked'),
                };

                if (arr.correct === true) {
                  // Allow the correct answer to pass validation
                  hasOneCorrectAnswer = true;
                }
                sender.answers.push(arr);
              }
            });

            // Check time, check number of answers.
            if (sender.time === 0) {
              return error(errorSelector, 'Enter the time (minutes and seconds) that the question should be asked at.');
            } else if (sender.question.length === 0) {
              return error(errorSelector, 'Please enter a question');
            } else if (sender.answers.length < 2) {
              return error(errorSelector, 'Every question must have at least two answers');
            } else if (!hasOneCorrectAnswer) {
              return error(errorSelector, 'You must have at least one correct answer');
            }

            // Trim the question now. 2000 chars max.
            sender.question = sender.question.substr(0, 2000);

            // Hide the error message alert box.
            error(errorSelector, 'reset');

            ajax('set-course-lesson-question', sender,
              function beforeSend() {
                btn.button();
              },
              function ajaxComplete(data) {
                const html = '<li>' +
                            '<a href="#" class="lq__question js-edit-question" ' +
                                'data-question-id="' + data.question.id + '">' +
                              data.question.text +
                            '</a>' +
                          '</li>';

                lesson.find('.lessonquestions').prepend(html);
                modal.closeModal();
              },
              function ajaxFailed() {
                error(errorSelector, 'There was a problem saving your question. Please try again.');
                btn.button('reset');
              },
              function ajaxAlways() {

              });
            return false;
          },
        },
      },
    });
    return e.preventDefault();
  })
  // Click event: Teacher is clicking on an in-video question link.
  // They can edit or delete the question now.
  .on('click', '.js-edit-question', function (e) {
    const t = $(this);
    let btn = $(this);
    const lesson = btn.closest('.lesson');
    let multipleChoiceHtml = '';

    // Set the question Id to look for the answers.
    sender.questionId = btn.attr('data-question-id');

    ajax('get-course-question-answers', sender,
      function beforeAnswerCollection() {
        // Button spinner
        btn.button();
      },
      function answerCollectionComplete(data) {
        // Immediately reset the button.
        btn.button('reset');

        for (let i in data.answers) {
          multipleChoiceHtml += '<tr class="no-hover question-option" data-answer-id="' + data.answers[i].id + '">' +
                                    '<td class="text--center"><input type="checkbox" class="question-option-checkbox" ' +
                                      (data.answers[i].correct ? " checked='checked'" : '') + ' />' +
                                    '</td>' +
                                    '<td>' +
                                      '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                        'placeholder="Add an answer here. Leave blank for no answer.">' +
                                        data.answers[i].answer +
                                      '</textarea>' +
                                    '</td>' +
                                  '</tr>';
        }
        // Add additional question space
        for (let i = 1; i <= (4-data.answers.length); i++) {
          multipleChoiceHtml += '<tr class="no-hover question-option">' +
                                    '<td class="text--center"><input type="checkbox" class="question-option-checkbox" /></td>' +
                                    '<td>' +
                                      '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                        'placeholder="Add an answer here. Leave blank for no answer."></textarea>' +
                                    '</td>' +
                                  '</tr>';
        }
        const modal = new Modal({
          title: 'Add In-Lesson Question',
          message: '<p>In-lesson Questions will stop a video and ask the student a question. ' +
                      'They are multiple choice with one or more correct answers.</p>' +
                      '<label class="label label--full">Time in video (minutes)</label>' +
                      '<input type="number" placeholder="1" class="account__input" id="minute" ' +
                        ' min="0" max="60" value="' + data.minutes + '" />' +
                      '<label class="label label--full">Time in video (seconds)</label>' +
                      '<input type="number" placeholder="15" class="account__input" id="second" min="0" max="59" ' +
                        ' value="' + data.seconds + '" />' +
                      '<label class="label label--full">Question</label>' +
                      '<textarea class="account__input" id="question-box" maxlength="2000" rows="2" placeholder="Which is the...">' +
                        data.question +
                      '</textarea>' +
                      '<table class="table table--nopadding" cellpadding="0" cellspacing="0">' +
                        '<thead>' +
                          '<tr>' +
                            '<th width="20%" class="text--center">Is Correct</th>' +
                            '<th>Answer Text</th>' +
                          '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                          multipleChoiceHtml +
                        '</tbody>' +
                      '</table>' +
                      '<p class="account__error js-error" id="question-error"></p>',
          buttons: {
            cancel: {
              label: 'Cancel',
            },
            save: {
              label: 'Save Question',
              className: 'js-edit-question',
              callback: function () {
                // Btn was previously declared.
                const btn2 = $('.js-edit-question');
                let minute = Number($('#minute').val());
                let second = Number($('#second').val());
                const errorSelector = $('#question-error');
                // Every question must have at least one correct answer at all times.
                let hasOneCorrectAnswer = false;

                if (isNaN(minute)) {
                  minute = 0;
                } else if (minute > 60) {
                  minute = 60;
                } else if (minute < 0) {
                  minute = 0;
                }

                if (isNaN(second)) {
                  second = 0;
                } else if (second > 59) {
                  second = 59;
                } else if (second < 0) {
                  second = 0;
                }

                sender.time = (minute * 60) + second;
                sender.question = $.trim($('#question-box').val());
                sender.answers = [];

                // Get all answers.
                $('.question-option').each(function () {
                  const answer = $.trim($('.question-option-answer', this).val());
                  let arr = {};
                  if (answer !== null && answer.length > 0) {
                    arr = {
                      answer: answer.substr(0, 500),
                      correct: $('.question-option-checkbox', this).is(':checked'),
                    };

                    if ($(this).attr('data-answer-id') !== undefined) {
                      arr.answerId = $(this).attr('data-answer-id');
                    }

                    if (arr.correct === true) {
                      // Allow the correct answer to pass validation
                      hasOneCorrectAnswer = true;
                    }
                  } else if ($(this).attr('data-answer-id') !== undefined && answer.length <= 0) {
                    // Check if this question should be removed (because of a blank answer)
                    // The answer has an id but no answer text. Remove this one.
                    arr = {
                      removeMe: true,
                      answerId: $(this).attr('data-answer-id'),
                    };
                  }

                  sender.answers.push(arr);
                });

                // Check time, check number of answers.
                if (sender.time === 0) {
                  return error(errorSelector, 'Enter the time (minutes and seconds) that the question should be asked at.');
                } else if (sender.question.length === 0) {
                  return error(errorSelector, 'Please enter a question');
                } else if (sender.answers.length < 2) {
                  return error(errorSelector, 'Every question must have at least two answers');
                } else if (!hasOneCorrectAnswer) {
                  return error(errorSelector, 'You must have at least one correct answer');
                }

                // Trim the question now. 2000 chars max.
                sender.question = sender.question.substr(0, 2000);

                // Hide the error message alert box.
                error(errorSelector, 'reset');
                ajax('set-course-lesson-question-edited', sender,
                  function beforeUpdate() {
                    // Spinner
                    btn2.button();
                  },
                  function updateComplete(savedData) {
                    // the .button() jQuery plugin does something unexpected:
                    // It doesnt give us back the same object when we .button('reset').
                    // To poorly get around this, we remove the entire element. :/
                    btn
                      .closest('li')
                      .html('<a href="#" class="lq__question js-edit-question" ' +
                              'data-question-id="' + savedData.id + '">' +
                                savedData.question +
                            '</a>');
                    modal.closeModal();
                  },
                  function updateFailed() {
                    error(errorSelector, 'There was a problem editing your question.');
                  },
                  function updateAlways() {
                    btn2.button('reset');
                  });
                return false;
              },
            },
            delete: {
              label: 'Delete Question',
              className: 'js-delete-question',
              callback: function () {
                const btn2 = $('.js-delete-question');

                ajax('set-course-lesson-question-delete', sender,
                  function beforeDelete() {
                    btn2.button();
                  },
                  function deleteComplete(deleteData) {
                    modal.closeModal();
                    $('.js-edit-question[data-question-id="' + deleteData.id + '"]')
                      .closest('li')
                      .slideUp(function () {
                        $(this).remove();
                      });
                  },
                  function deleteFailed() {

                  },
                  function deleteAlways() {
                    btn2.button('reset');
                  });
                return false;
              },
            },
          },
        });
      },
      function answerCollectionFailed() {
      },
      function answerCollectionAlways() {
        btn.button('reset');
      });

    return e.preventDefault();
  })
  // Submit event: Document lesson is being saved.
  .on('submit', '.js-save-lesson-body', function (e) {
    e.preventDdefault();

    const form = $(this);
    const lesson = form.closest('.lesson');
    const btn = $('button[type="submit"]', form);
    // const errorSelector = $('.js-error', form);

    sender.lessonId = lesson.attr('data-lesson-id');
    sender.body = $.trim($('.js-wysiwyg', lesson).trumbowyg('html'));

    ajax('set-course-lesson-document-body', sender,
      function beforeAjaxRequest() {
        // Change button to "loading" state
        btn.button();
      },
      function ajaxRequestComplete(data) {
        // Button in saved state
        btn.button('saved');
        // Update the editor with what the server recorded.
        $('.js-wysiwyg', lesson).trumbowyg('html', data.body);
      },
      function ajaxRequestFailed() {
        btn.button('reset');
      },
      function ajaxRequestAlways() {
      });
    return false;
  })
  // Click event: Teacher is clicking on a quiz lesson question
  // They can edit or delete the question now.
  // Note: Don't mix this up with .js-edit-question
  .on('click', '.js-edit-quiz-question', function (e) {
    const btn = $(this);
    const lesson = btn.closest('.lesson');
    let multipleChoiceHtml = '';

    // LessonId
    sender.lessonId = lesson.attr('data-lesson-id');
    // Set the question Id to look for the answers.
    sender.questionId = btn.attr('data-quiz-question-id');

    ajax('get-course-lesson-quiz-answers', sender,
      function beforeAnswerCollection() {
        // Button spinner
        btn.button();
      },
      function answerCollectionComplete(data) {
        // Immediately reset the button.
        btn.button('reset');

        for (let i in data.answers) {
          multipleChoiceHtml += '<tr class="no-hover question-option" data-answer-id="' + data.answers[i].id + '">' +
                                    '<td class="text--center"><input type="checkbox" class="question-option-checkbox" ' +
                                      (data.answers[i].correct ? " checked='checked'" : '') + ' />' +
                                    '</td>' +
                                    '<td>' +
                                      '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                        'placeholder="Add an answer here. Leave blank for no answer.">' +
                                        data.answers[i].answer +
                                      '</textarea>' +
                                    '</td>' +
                                  '</tr>';
        }
        // Add additional question space
        for (let i = 1; i <= (4 - data.answers.length); i++) {
          multipleChoiceHtml += '<tr class="no-hover question-option">' +
                                    '<td class="text--center"><input type="checkbox" class="question-option-checkbox" /></td>' +
                                    '<td>' +
                                      '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                        'placeholder="Add an answer here. Leave blank for no answer."></textarea>' +
                                    '</td>' +
                                  '</tr>';
        }
        const modal = new Modal({
          title: 'Edit Quiz Question',
          message:    '<label class="label label--full">Question</label>' +
                      '<textarea class="account__input" id="question-box" maxlength="2000" rows="2" placeholder="Which is the...">' +
                        data.question +
                      '</textarea>' +
                      '<table class="table table--nopadding" cellpadding="0" cellspacing="0">' +
                        '<thead>' +
                          '<tr>' +
                            '<th width="20%" class="text--center">Is Correct</th>' +
                            '<th>Answer Text</th>' +
                          '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                          multipleChoiceHtml +
                        '</tbody>' +
                      '</table>' +
                      '<p class="account__error js-error" id="question-error"></p>',
          buttons: {
            cancel: {
              label: 'Cancel',
            },
            save: {
              label: 'Save Question',
              className: 'js-edit-quiz-question-confirmed',
              callback: function () {
                // Btn was previously declared.
                const btn2 = $('.js-edit-quiz-question-confirmed');
                const errorSelector = $('#question-error');
                // Every question must have at least one correct answer at all times.
                let hasOneCorrectAnswer = false;

                sender.question = $.trim($('#question-box').val());
                sender.answers = [];

                // Get all answers.
                $('.question-option').each(function () {
                  const answer = $.trim($('.question-option-answer', this).val());
                  let arr = {};
                  if (answer !== null && answer.length > 0) {
                    arr = {
                      answer: answer.substr(0, 500),
                      correct: $('.question-option-checkbox', this).is(':checked'),
                    };

                    if ($(this).attr('data-answer-id') !== undefined) {
                      arr.answerId = $(this).attr('data-answer-id');
                    }

                    if (arr.correct === true) {
                      // Allow the correct answer to pass validation
                      hasOneCorrectAnswer = true;
                    }
                  } else if ($(this).attr('data-answer-id') !== undefined && answer.length <= 0) {
                    // Check if this question should be removed (because of a blank answer)
                    // The answer has an id but no answer text. Remove this one.
                    arr = {
                      removeMe: true,
                      answerId: $(this).attr('data-answer-id')
                    };
                  }

                  sender.answers.push(arr);
                });

                // Error if there is no correct answer selected.
                if (!hasOneCorrectAnswer) {
                  return error(errorSelector, 'You must have at least one correct answer');
                }

                // Trim the question now. 2000 chars max.
                sender.question = sender.question.substr(0, 2000);

                // Hide the error message alert box.
                error(errorSelector, 'reset');
                ajax('set-course-lesson-quiz-question-edited', sender,
                  function beforeUpdate() {
                    // Spinner
                    btn2.button();
                  },
                  function updateComplete(savedData) {
                    // the .button() jQuery plugin does something unexpected:
                    // It doesnt give us back the same object when we .button('reset').
                    // To poorly get around this, we remove the entire element. :/
                    btn
                      .closest('li')
                      .html('<a href="#" class="lq__question js-edit-quiz-question" ' +
                              'data-quiz-question-id="' + savedData.id + '">' +
                                savedData.question +
                            '</a>');
                    modal.closeModal();
                  },
                  function updateFailed() {
                    error(errorSelector, 'There was a problem editing your question.');
                  },
                  function updateAlways() {
                    btn2.button('reset');
                  });
                return false;
              },
            },
            delete: {
              label: 'Delete Question',
              className: 'js-delete-question',
              callback: function () {
                const btn = $('.js-delete-question');

                ajax('set-course-lesson-question-delete', sender,
                  function beforeDelete() {
                    btn.button();
                  },
                  function deleteComplete(deleteData) {
                    modal.closeModal();
                    $('.js-edit-quiz-question[data-quiz-question-id="' + deleteData.id + '"]')
                      .closest('li')
                      .slideUp(function () {
                        $(this).remove();
                      });
                  },
                  function deleteFailed() {

                  },
                  function deleteAlways() {
                    btn.button('reset');
                  });
                return false;
              },
            },
          },
        });
      },
      function answerCollectionFailed() {
      },
      function answerCollectionAlways() {
        btn.button('reset');
      });

    return e.preventDefault();
  })
  // Click even: A new in-video question is being added.
  .on('click', '.js-add-quiz-question', function (e) {
    const t = $(this);
    const lesson = t.closest('.lesson');
    let multipleChoiceHtml = '';
    for (let i = 1; i <= 4; i++) {
      multipleChoiceHtml += '<tr class="no-hover question-option">' +
                                '<td class="text--center"><input type="checkbox" class="question-option-checkbox" /></td>' +
                                '<td>' +
                                  '<textarea class="question-option-answer account__input" maxlength="500" rows="2" ' +
                                    'placeholder="Add an answer here. Leave blank for no answer."></textarea>' +
                                '</td>' +
                              '</tr>';
    }
    const modal = new Modal({
      title: 'Add Quiz Question',
      message:    '<label class="label label--full">Question</label>' +
                  '<textarea class="account__input" id="question-box" maxlength="2000" rows="2" placeholder="Which is the..."></textarea>' +
                  '<table class="table table--nopadding" cellpadding="0" cellspacing="0">' +
                    '<thead>' +
                      '<tr>' +
                        '<th width="20%" class="text--center">Is Correct</th>' +
                        '<th>Answer Text</th>' +
                      '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                      multipleChoiceHtml +
                    '</tbody>' +
                  '</table>' +
                  '<p class="account__error js-error" id="question-error"></p>',
      buttons: {
        cancel: {
          label: 'Cancel',
        },
        save: {
          label: 'Add Question',
          className: 'js-add-new-quiz-question',
          callback: function () {
            const btn = $('.js-add-new-quiz-question');
            // A few rare circumstances where we use ID's instead of .js-* classNames
            const errorSelector = $('#question-error');
            // Every question must have at least one correct answer at all times.
            let hasOneCorrectAnswer = false;

            sender.question = $.trim($('#question-box').val());
            sender.lessonId = lesson.attr('data-lesson-id');
            sender.answers = [];

            // Get all answers.
            $('.question-option').each(function () {
              const answer = $.trim($('.question-option-answer', this).val());
              if (answer !== null && answer.length > 0) {
                const arr = {
                  answer: answer.substr(0, 500),
                  correct: $('.question-option-checkbox', this).is(':checked'),
                };

                if (arr.correct === true) {
                  // Allow the correct answer to pass validation
                  hasOneCorrectAnswer = true;
                }
                sender.answers.push(arr);
              }
            });

            // Error if there is no correct answer selected.
            if (!hasOneCorrectAnswer) {
              return error(errorSelector, 'You must have at least one correct answer');
            }

            // Trim the question now. 2000 chars max.
            sender.question = sender.question.substr(0, 2000);

            // Hide the error message alert box.
            error(errorSelector, 'reset');

            ajax('set-course-lesson-quiz-question', sender,
              function beforeSend() {
                btn.button();
              },
              function ajaxComplete(data) {
                const html = '<li>' +
                            '<a href="#" class="lq__question js-edit-quiz-question" ' +
                                'data-quiz-question-id="' + data.question.id + '">' +
                              data.question.text +
                            '</a>' +
                          '</li>';

                lesson.find('.lessonquestions').prepend(html);
                modal.closeModal();
              },
              function ajaxFailed() {
                error(errorSelector, 'There was a problem saving your question. Please try again.');
                btn.button('reset');
              },
              function ajaxAlways() {

              });
            return false;
          },
        },
      },
    });
    return e.preventDefault();
  })
  // Click event. A lesson being requested.
  // NOTE: This event won't ask for a lessonType, the lessonId is passed and the server
  //       figures out what the lesson type is, and returns the proper data.
  .on('click', '.js-open-lesson', function (e) {
    const t = $(this);
    const originalButtonText = t.text();
    const lesson = t.closest('.lesson');
    const isOpened = lesson.attr('data-opened') === 'false' ? false : true;

    sender.lessonId = lesson.attr('data-lesson-id');

    if (!isOpened) {
      ajax('get-course-lesson', sender,
        function beforeSend() {
          t.text('Loading...');
        },
        function sendComplete(data) {
          // The `data` response will hold either:
          // a) a quiz object
          // b) a document object
          // c) a video object
          createLessonHtml(lesson, data);
        },
        function sendFailed() {

        },
        function sendAlways() {
          t.text(originalButtonText);
        });
    } else {
      // Lesson was already opened, do nothing.
    }

    return e.preventDefault();
  })
  // Click even: a new lesson is being created.
  .on('click', '.js-add-lesson', function (e) {
    const t = $(this);
    const lesson = t.closest('.lesson');
    const modal = new Modal({
      title: 'New Lesson',
      message:  '<label class="label label--full">Lesson Name</label>' +
                '<form>' +
                  '<input class="account__input" id="lesson-name-box" maxlength="250" placeholder="What is the name of this lesson?" type="text"> ' +
                '<label class="label label--full">Lesson Type</label>' +
                '</form>' +
                '<div class="p-t-b-10">' +
                  '<label><input checked="checked" name="lesson-type" type="radio" value="video"> Video</label>' +
                '</div>' +
                '<div class="p-t-b-10">' +
                  '<label><input name="lesson-type" type="radio" value="document"> Reading Material (document)</label>' +
                '</div>' +
                '<div class="p-t-b-10">' +
                  '<label><input name="lesson-type" type="radio" value="quiz"> Quiz/Test</label>' +
                '</div>',
      size: 'small',
      buttons: {
        addLesson: {
          label: 'Add Lesson',
          className: 'js-create-lesson',
          callback: function () {
            const btn = $('.js-create-lesson');

            sender.name = $.trim($('#lesson-name-box').val());
            sender.lesson_type = $('input[name="lesson-type"]:checked').val();

            if (sender.name === '') {
              $('#lesson-name-box').focus();
              return false;
            }

            ajax('set-course-lesson-create', sender,
              function beforeSender() {
                btn.button();
              },
              function sendComplete(data) {
                // Add the new HTML to the dom, then trigger a click to load the lesson details.
                // this isn't the best way of doing this, but for how often this feature is used,
                // it's not terrible important.

                const item = '<li class="lesson draggable" ' +
                                'data-lesson-id="' + data.lesson.id + '" data-opened="false">' +
                                '<span class="lesson__number">' +
                                  ($('li.lesson.draggable').length + 1) +
                                '</span>' +
                                '<a href="#open-lesson" class="js-open-lesson lesson__open">' +
                                  data.lesson.name +
                                '</a> ' +
                                ' <span class="lesson__published">(Unpublished)</span>' +
                                '<i class="fa fa-arrows lesson__drag js-drag-lesson"></i>' +
                              '</li>';
                lesson.before(item);
                // Load and open the new lesson area
                setTimeout(function () {
                  dragAndDrop();
                  $(".lesson[data-lesson-id='" + data.lesson.id + "'] .js-open-lesson").click();
                }, 50);

                // Reorder the lesson numbers
                $('li.lesson[data-lesson-id]').each(function (i) {
                  $(this).find('.lesson__number').text((i + 1));
                });


                // Close the modal.
                modal.closeModal();
            },
            function sendFailed() {
              btn.button('reset');
            },
            function sendAlways() {

            });
            return false;
          },
        },
        cancel: {
          label: "Cancel",
          className: "btn-link pull-left"
        },
      },
    });
    return e.preventDefault();
  })
  // Click even: teacher wants to add a new module
  .on('click', '.js-add-module', function (e) {
    const t = $(this);
    const module = t.closest('.sman__module');
    // The module weight is all the current modules + 1
    sender.weight = $('.sman__module[data-module-id]').length + 1;

    const modal = new Modal({
      title: 'Add Module',
      message: '<label class="label label--full">Module Name*</label>' +
              '<input class="account__input" id="module-name-box" maxlength="100" placeholder="Module Name" type="text" />',
      size: 'small',
      buttons: {
        cancel: {
          label: "Cancel",
        },
        save: {
          label: "Add Module",
          className: "js-create-module",
          callback: function() {

            const btn = $(".js-create-module");
            sender.name = $.trim($("#module-name-box").val().substr(0,100));
            sender.description = null; // We disabled this feature, sorry everyone!

            if (sender.name === '') {
              $('#module-name-box').focus();
              return false;
            }


            ajax('set-course-module-create', sender,
              function beforeSend() {
                btn.button();
              },
              function sendComplete (data) {
                modal.closeModal();

                const html = '<ul class="sman__module" data-module-id="' + data.module.id + '">' +
                              '<li class="sman__modulename">' +
                                '<span class="sman__modulenumber">' + sender.weight + '</span> ' +
                                data.module.name +
                              '</li>' +
                              '<li>' +
                                '<ul class="lessons lesson--sortable">' +
                                  '<li class="lesson lesson--add">' +
                                    '<a href="#new-lesson" class="js-add-lesson">' +
                                      '<i class="fa fa-plus"></i> Add New Lesson' +
                                    '</a>' +
                                  '</li>' +
                                '</ul>' +
                              '</li>' +
                           '</ul>';
                module.before(html);

                // Re-init drag and drop since we added a new .lesson--sortable class.
                dragAndDrop();
              },
              function sendFailed(err) {
                btn.button('reset');
              },
              function sendAlways() {

              });

            return false;
          },
        },
      },
    });
    return e.preventDefault();
  })

  const createLessonHtml = function (lessonSelector, data) {
    // For holding generated html for managing files.
    let filesHtml = '';
    // For holding generated html for managing quiz questions
    let quizQuestionsHtml = '';
    // For holding generated html for managing invide questions
    let questionsHtml = '';
    // For holding the entire HTML for a lesson.
    let html = '';
    // For holding the "lesson title and description" block
    let lessonDetailsHtml = '';

    // If there are any files, loop through them and add to the `filesHtml` var
    for (let i in data.files) {
      filesHtml += '<li>' +
                    '<a href="/" class="lessonfile" data-file-id="' + data.files[i].id + '">' +
                      '<i class="fa fa-file-o"></i> ' +
                        data.files[i].name +
                    '</a>' +
                  '</li>';
    }

    // Set the lesson title and description html
    lessonDetailsHtml += '<form class="js-save-lesson-text">' +
                           '<label class="label">Lesson Title</label>' +
                           '<input type="text" required="required" name="lesson_title" ' +
                            'class="account__input" placeholder="Lesson Title" value="' + data.lesson.title + '" />' +
                           '<label class="label">Description</label>' +
                           '<textarea name="lesson_description" rows="2" class="account__input">' +
                            data.lesson.description +
                           '</textarea>' +
                           '<div class="account__error js-error"></div>' +
                           '<button type="submit" class="btn btn--sm">Save</button>' +
                         '</form>';


    if (data.lesson.type === 'video') {
      for (let i in data.lesson.video.questions) {
        questionsHtml += '<li>' +
                          '<a href="#" class="lq__question js-edit-question" data-question-id=" ' +
                            data.lesson.video.questions[i].id + '">' +
                            data.lesson.video.questions[i].question +
                          '</a>' +
                        '</li>';
      }
      html += '<div class="lesson__content">' +
                '<div class="lesson__forms">' +
                  '<form class="lf__video js-upload-video-form">' +
                    '<input type="file" class="js-video-selector" accept=".mp4" />' +
                  '</form>' +
                  '<form class="lf__video js-upload-extra-form">' +
                    '<input type="file" class="js-file-selector" />' +
                  '</form>' +
                '</div>' +
                '<div class="lesson__box">' +
                  '<div class="boxes">' +
                    '<div class="box--70" style="padding-right: 10px;">' +
                      '<h4 class="lesson__boxtitle">Video Details</h4>' +
                      '<div class="lesson__detail">Video name: ' +
                        '<span class="js-video-file-name">' + data.lesson.video.filename + '</span>' +
                      '</div>' +
                     '<div class="lesson__detail">Video length: ' +
                        '<span class="js-video-length">' + data.lesson.video.time + '</span>' +
                      '</div>' +
                     '<div class="lesson__detail">' +
                       '<button class="btn js-upload-video">Upload New Video</button>' +
                       '<span class="js-video-upload-progress"></span>' +
                       '<span class="js-video-name"></span>' +
                       '<div class="account__error js-video-error"></div>' +
                     '</div>' +
                   '</div>' +
                   '<div class="box--30 hidden--lg">' +
                     '<img src="' + data.cover + '" style="width: 100%;" />' +
                   '</div>' +
                 '</div>' +
               '</div>' +
               '<div class="boxes">' +
                 '<div class="box--70 lesson__box">' +
                  lessonDetailsHtml +
                 '</div>' +
                 '<div class="box--30 lesson__box">' +
                   '<label class="label label--full">Additional Files</label>' +
                   '<ul class="lessonfiles">' +
                     filesHtml +
                    '</ul>' +
                   '<a href="/" class="btn btn--sm js-upload-file">' +
                     'Upload Supplemental File' +
                   '</a>' +
                 '</div>' +
               '</div>' +
               '<div class="boxes">' +
                 '<div class="box--70 lesson__box">' +
                   '<form >' +
                     '<label class="label">In-Video Questions</label>' +
                     '<ul class="lessonquestions">' +
                       questionsHtml +
                      '<li>' +
                        '<a href="#" class="btn btn--sm js-add-quiz-question">' +
                          '<i class="fa fa-plus"></i> Add new question' +
                        '</a>' +
                      '</li>' +
                      '</ul>' +
                     '<div class="account__error js-error"></div>' +
                   '</form>' +
                 '</div>' +
                 '<div class="box--30 lesson__box">' +
                   '<label class="label label--full">Lesson Settings</label>' +
                   '<ul class="lessonfiles">' +
                     '<li>' +
                       '<label>' +
                         '<input type="checkbox" class="js-publish-lesson" ' +
                            (data.lesson.published ? ' checked="checked" ' : '') +
                          ' /> Lesson Published' +
                       '</label>' +
                     '</li>' +
                     '<li>' +
                       '<label>' +
                         '<input type="checkbox" class="js-free-preview" ' +
                            (data.lesson.freePreview ? ' checked="checked" ' : '') +
                          '/> Free Preview' +
                       '</label>' +
                     '</li>' +
                     '<li>' +
                       '<label class="text--red">' +
                         '<a href="#" class="btn btn--text btn--danger js-delete-lesson" data-action="confirm">' +
                          '<i class="fa fa-times fa-fw"></i> Delete Lesson</a>' +
                       '</label>' +
                     '</li>' +
                   '</ul>' +
                 '</div>' +
              '</div>' +
            '</div>';
    } else if (data.lesson.type === 'document') {
      html += '<div class="lesson__content">' +
                '<div class="lesson__forms">' +
                  '<form class="lf__video js-upload-extra-form">' +
                    '<input type="file" class="js-file-selector" />' +
                  '</form>' +
                '</div>' +
                '<div class="boxes">' +
                  '<div class="box--70 lesson__box">' +
                    lessonDetailsHtml +
                    '<div class="account__error js-video-error"></div>' +
                  '</div>' +
                  '<div class="box--30 lesson__box">' +
                    '<label class="label label--full">Additional Files</label>' +
                    '<ul class="lessonfiles">' +
                      filesHtml +
                    '</ul>' +
                    '<a href="/" class="btn btn--sm js-upload-file">Upload Supplemental File</a>' +
                  '</div>' +
                '</div>' +
                '<div class="boxes">' +
                  '<div class="box--70 lesson__box">' +
                    '<form class="js-save-lesson-body">' +
                      '<label class="label">Document Body</label>' +
                      '<textarea class="account__input js-wysiwyg" name="body" rows="2" placeholder="Add your document content">' +
                        data.lesson.document.body +
                      '</textarea>' +
                      '<div class="account__error js-error"></div>' +
                      '<button type="submit" class="btn btn--sm">Save Document</button>' +
                    '</form>' +
                  '</div>' +
                  '<div class="box--30 lesson__box">' +
                    '<label class="label label--full">Lesson Settings</label>' +
                    '<ul class="lessonfiles">' +
                      '<li>' +
                        '<label>' +
                           '<input type="checkbox" class="js-publish-lesson" ' +
                              (data.lesson.published ? ' checked="checked" ' : '') +
                            ' /> Lesson Published' +
                        '</label>' +
                      '</li>' +
                      '<li>' +
                        '<label class="text--red">' +
                          '<a href="#" class="btn btn--text btn--danger js-delete-lesson" data-action="confirm">' +
                            '<i class="fa fa-times fa-fw"></i> Delete Lesson</a>' +
                        '</label>' +
                      '</li>' +
                    '</ul>' +
                  '</div>' +
                '</div>' +
              '</div>';
    } else if (data.lesson.type === 'quiz') {
      for (let i in data.lesson.quiz.questions) {
        quizQuestionsHtml += '<li>' +
                          '<a href="#" class="lq__question js-edit-quiz-question" ' +
                           'data-quiz-question-id="' + data.lesson.quiz.questions[i].id + '">' +
                            data.lesson.quiz.questions[i].question +
                          '</a>' +
                        '</li>';
      }

      html += '<div class="lesson__content">' +
                '<div class="lesson__forms">' +
                  '<form class="lf__video js-upload-extra-form">' +
                    '<input type="file" class="js-file-selector" />' +
                  '</form>' +
                '</div>' +
                '<div class="boxes">' +
                  '<div class="box--70 lesson__box">' +
                    lessonDetailsHtml +
                  '</div>' +
                  '<div class="box--30 lesson__box">' +
                    '<label class="label label--full">Lesson Settings</label>' +
                    '<ul class="lessonfiles">' +
                      '<li>' +
                        '<label>' +
                         '<input type="checkbox" class="js-publish-lesson" ' +
                            (data.lesson.published ? ' checked="checked" ' : '') +
                          ' /> Lesson Published' +
                        '</label>' +
                      '</li>' +
                      '<li>' +
                        '<label class="text--red">' +
                          '<a href="#" class="btn btn--text btn--danger js-delete-lesson" data-action="confirm">' +
                            '<i class="fa fa-times fa-fw"></i> Delete Lesson</a>' +
                        '</label>' +
                      '</li>' +
                    '</ul>' +
                  '</div>' +
                '</div>' +
                '<div class="boxes">' +
                  '<div class="box lesson__box">' +
                    '<form class="js-save-lesson-body">' +
                      '<label class="label">Questions <span class="js-total-quiz-questions"></span></label>' +
                      '<ul class="lessonquestions">' +
                        quizQuestionsHtml +
                        '<li>' +
                          '<a href="#" class="btn btn--sm js-add-quiz-question">' +
                            '<i class="fa fa-plus"></i> Add new question' +
                          '</a>' +
                        '</li>' +
                      '</ul>' +
                      '<div class="account__error js-error"></div>' +
                    '</form>' +
                  '</div>' +
                '</div>' +
              '</div>';
    }

    // Append the HTML.
    lessonSelector.append(html);
    // Set the data attr to "opened": true;
    lessonSelector.attr('data-opened', true);

    if(!data.lesson.published) {
      lessonSelector
        .addClass('lesson--unpublished lesson--active')
        .find('.lesson__published')
        .text('(Unpublished)');
    } else {
      lessonSelector
        .addClass('lesson--active')
        .find('.lesson__published')
        .text('(Published)');
    }

    // Apply editor, if needed.
    lessonSelector.find('.js-wysiwyg').trumbowyg({
      btns: [
        // ['viewHTML'],
        // ['formatting'],
        ['h3', 'h4'],
        ['strong', 'em', 'underline'],
        // ['superscript', 'subscript'],
        ['link'],
        // ['insertImage'],
        // 'btnGrp-justify',
        'btnGrp-lists',
        // ['horizontalRule'],
        ['removeformat'],
        // ['fullscreen']
      ],
      removeformatPasted: true,
      autogrow: true,
    });
  };
})
